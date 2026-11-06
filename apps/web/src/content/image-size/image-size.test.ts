import { describe, expect, it, vi } from 'vitest';

import { createImageSizeReader } from './image-size';

vi.mock('server-only', () => ({}));

const ADDRESS =
  'https://images.seojaewan.com/notion/410c97ba-fd89-8100-0000-000000000001/20261106T023300Z';

/**
 * 크기 머리를 가진 응답을 만든다.
 * @param width 폭 머리
 * @param height 높이 머리
 * @returns 응답
 */
function sizedResponse(width: string, height: string): Response {
  return new Response(null, {
    status: 200,
    headers: { 'X-Image-Width': width, 'X-Image-Height': height },
  });
}

/**
 * 끊길 때까지 답하지 않는 fetch. 끊기면 끊긴 이유로 실패한다.
 * @param _url 주소
 * @param init 요청 설정
 * @returns 끊기면 실패하는 Promise
 */
function hangingFetch(_url: string | URL | Request, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(init.signal?.reason instanceof Error ? init.signal.reason : new Error('aborted'));
    });
  });
}

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('이미지 서버에 HEAD를 보내 X-Image-Width·X-Image-Height로 크기를 받는다', async () => {
    const fetch = vi.fn(() => Promise.resolve(sizedResponse('1440', '810')));
    const readSize = createImageSizeReader({ fetch });
    expect(await readSize(ADDRESS)).toEqual({ kind: 'sized', width: 1440, height: 810 });
    expect(fetch).toHaveBeenCalledWith(ADDRESS, expect.objectContaining({ method: 'HEAD' }));
  });

  it('이미지 서버가 실패 상태로 답하면 이유와 함께 실패를 돌려주고 오류를 던지지 않는다', async () => {
    const readSize = createImageSizeReader({
      fetch: () => Promise.resolve(new Response(null, { status: 502 })),
    });
    expect(await readSize(ADDRESS)).toEqual({ kind: 'failed', reason: '상태 502' });
  });

  it('이미지 서버에 닿지 않으면 실패를 돌려주고 오류를 던지지 않는다', async () => {
    const readSize = createImageSizeReader({
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    });
    expect(await readSize(ADDRESS)).toEqual({
      kind: 'failed',
      reason: '요청하지 못했다(fetch failed)',
    });
  });

  it('크기 머리가 없거나 숫자가 아니면 실패다', async () => {
    const missing = createImageSizeReader({
      fetch: () => Promise.resolve(new Response(null, { status: 200 })),
    });
    const invalid = createImageSizeReader({
      fetch: () => Promise.resolve(sizedResponse('wide', '0')),
    });
    expect(await missing(ADDRESS)).toEqual({ kind: 'failed', reason: '크기 머리가 없다' });
    expect(await invalid(ADDRESS)).toEqual({ kind: 'failed', reason: '크기 머리가 없다' });
  });

  it('정한 시간 안에 답하지 않으면 요청을 끊고 시간 초과로 실패한다', async () => {
    const readSize = createImageSizeReader({ fetch: hangingFetch, timeoutMs: 20 });
    expect(await readSize(ADDRESS)).toEqual({
      kind: 'failed',
      reason: '20ms 안에 답하지 않았다',
    });
  });

  it('동시에 보내는 요청은 정한 수를 넘지 않고, 기다린 요청도 모두 답을 받는다', async () => {
    let running = 0;
    let maxRunning = 0;
    const readSize = createImageSizeReader({
      concurrency: 2,
      fetch: async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;
        return sizedResponse('720', '405');
      },
    });
    const results = await Promise.all(Array.from({ length: 5 }, () => readSize(ADDRESS)));
    expect(maxRunning).toBe(2);
    expect(results).toHaveLength(5);
    expect(results.every((result) => result.kind === 'sized')).toBe(true);
  });
});
