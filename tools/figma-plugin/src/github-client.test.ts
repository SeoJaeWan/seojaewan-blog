import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBlob,
  createBranch,
  createPullRequest,
  getBranchHead,
  getFileText,
} from './github-client';

const TOKEN = 'github_pat_test_secret';

type Step = Response | Error | object;

/**
 * 호출 순서대로 응답하는 fetch를 흉내 낸다. Error나 객체는 거부, Response는 그대로 응답한다.
 * @param steps 호출마다 돌려줄 값
 * @returns fetch mock
 */
function mockFetch(steps: Step[]): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockRejectedValue(new Error('예상하지 못한 호출'));
  for (const step of steps) {
    if (step instanceof Response) {
      mock.mockResolvedValueOnce(step);
    } else {
      mock.mockRejectedValueOnce(step);
    }
  }
  vi.stubGlobal('fetch', mock);
  return mock;
}

/**
 * JSON 응답을 만든다.
 * @param status 상태 코드
 * @param body 본문
 * @returns 응답
 */
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

/**
 * 모든 다시 시도 대기를 지나 끝날 때까지 기다린다.
 * @param promise 대기할 작업
 * @returns 작업 결과
 */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const guarded = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.advanceTimersByTimeAsync(10_000);
  const result = await guarded;
  if ('error' in result) {
    throw result.error;
  }
  return result.value;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('GitHub 요청 다시 시도', () => {
  it('5xx 뒤 성공하면 결과를 돌려준다', async () => {
    const mock = mockFetch([json(503, { message: 'unavailable' }), json(200, { sha: 'abc' })]);
    await expect(settle(createBlob(TOKEN, 'aGk='))).resolves.toBe('abc');
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('본문이 HTML인 5xx도 다시 시도하고, 끝내 실패하면 읽을 수 있는 오류를 낸다', async () => {
    const mock = mockFetch(
      Array.from({ length: 4 }, () => new Response('<html>Bad Gateway</html>', { status: 502 })),
    );
    const failure = settle(createBlob(TOKEN, 'aGk=')).catch((error: unknown) => error);
    await expect(failure).resolves.toEqual(
      expect.objectContaining({ message: expect.stringContaining('(502)') as string }),
    );
    expect(mock).toHaveBeenCalledTimes(4);
  });

  it('1초, 2초, 4초 간격으로 세 번 다시 시도한다', async () => {
    const mock = mockFetch([
      json(500, {}),
      json(500, {}),
      json(500, {}),
      json(200, { sha: 'done' }),
    ]);
    const result = createBlob(TOKEN, 'aGk=');
    await vi.advanceTimersByTimeAsync(0);
    expect(mock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(mock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4000);
    expect(mock).toHaveBeenCalledTimes(4);
    await expect(result).resolves.toBe('done');
  });

  it('Error가 아닌 객체로 거부해도 다시 시도하고, 끝내 실패하면 [object Object]가 아니다', async () => {
    const rejection = { message: 'Failed to fetch', type: 'network' };
    const mock = mockFetch([rejection, rejection, rejection, rejection]);
    const failure = await settle(getBranchHead(TOKEN, 'main')).catch((error: unknown) => error);
    expect(mock).toHaveBeenCalledTimes(4);
    expect(failure).toBeInstanceOf(Error);
    const message = failure instanceof Error ? failure.message : '';
    expect(message).toContain('Failed to fetch');
    expect(message).not.toContain('[object Object]');
    expect(message).not.toContain(TOKEN);
  });

  it('객체 거부 뒤 성공하면 이어 간다', async () => {
    mockFetch([
      { message: 'Failed to fetch' },
      json(200, { object: { sha: 'c1' } }),
      json(200, { tree: { sha: 't1' } }),
    ]);
    await expect(settle(getBranchHead(TOKEN, 'x'))).resolves.toEqual({
      commitSha: 'c1',
      treeSha: 't1',
    });
  });

  it('4xx는 다시 시도하지 않는다', async () => {
    const mock = mockFetch([json(422, { message: 'Validation Failed' })]);
    await expect(settle(createBlob(TOKEN, 'aGk='))).rejects.toThrow('Validation Failed');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('404는 다시 시도하지 않고 null이다', async () => {
    const mock = mockFetch([json(404, { message: 'Not Found' })]);
    await expect(settle(getFileText(TOKEN, 'a.json', 'main'))).resolves.toBeNull();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('한도 초과를 알리는 403은 다시 시도하고, 그 밖의 403은 하지 않는다', async () => {
    const limited = new Response('{}', { status: 403, headers: { 'retry-after': '1' } });
    const mock = mockFetch([limited, json(200, { sha: 'ok' })]);
    await expect(settle(createBlob(TOKEN, 'aGk='))).resolves.toBe('ok');
    expect(mock).toHaveBeenCalledTimes(2);

    const forbidden = mockFetch([json(403, { message: 'Forbidden' })]);
    await expect(settle(createBlob(TOKEN, 'aGk='))).rejects.toThrow('Forbidden');
    expect(forbidden).toHaveBeenCalledTimes(1);
  });

  it('토큰은 요청 헤더에만 넣고 오류 문장에는 넣지 않는다', async () => {
    const mock = mockFetch([json(401, { message: 'Bad credentials' })]);
    const failure = await settle(createBlob(TOKEN, 'aGk=')).catch((error: unknown) => error);
    expect(String(failure)).not.toContain(TOKEN);
    expect(JSON.stringify(mock.mock.calls[0])).toContain(TOKEN);
  });

  it('브랜치를 만드는 POST가 실패해도 브랜치가 이미 그 커밋이면 성공으로 본다', async () => {
    mockFetch([
      json(422, { message: 'Reference already exists' }),
      json(200, { object: { sha: 'c9' } }),
    ]);
    await expect(settle(createBranch(TOKEN, 'feat/x', 'c9'))).resolves.toBeUndefined();
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('PR 열기', () => {
  const pullRequest = { title: 't', body: 'b', head: 'feat/figma-taskbar', base: 'main' };

  it('PR을 만들면 주소를 돌려준다', async () => {
    mockFetch([json(201, { html_url: 'https://github.com/o/r/pull/1' })]);
    await expect(settle(createPullRequest(TOKEN, pullRequest))).resolves.toBe(
      'https://github.com/o/r/pull/1',
    );
  });

  it('422로 실패하면 같은 head로 열린 PR을 찾아 쓴다', async () => {
    const mock = mockFetch([
      json(422, { message: 'A pull request already exists' }),
      json(200, [{ html_url: 'https://github.com/o/r/pull/7', number: 7 }]),
    ]);
    await expect(settle(createPullRequest(TOKEN, pullRequest))).resolves.toBe(
      'https://github.com/o/r/pull/7',
    );
    expect(mock).toHaveBeenCalledTimes(2);
    const lookup = String(mock.mock.calls[1]?.[0]);
    expect(lookup).toContain('state=open');
    expect(decodeURIComponent(lookup)).toContain('feat/figma-taskbar');
  });

  it('5xx가 끝내 이어져도 이미 열린 PR이 있으면 그 PR을 쓴다', async () => {
    mockFetch([
      json(500, {}),
      json(500, {}),
      json(500, {}),
      json(500, {}),
      json(200, [{ html_url: 'https://github.com/o/r/pull/8', number: 8 }]),
    ]);
    await expect(settle(createPullRequest(TOKEN, pullRequest))).resolves.toBe(
      'https://github.com/o/r/pull/8',
    );
  });

  it('열린 PR이 없으면 처음 오류를 그대로 낸다', async () => {
    mockFetch([json(422, { message: 'Validation Failed' }), json(200, [])]);
    await expect(settle(createPullRequest(TOKEN, pullRequest))).rejects.toThrow(
      'Validation Failed',
    );
  });
});
