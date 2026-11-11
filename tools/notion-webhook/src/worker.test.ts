import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { type Env, handleRequest } from './worker.ts';

// @codocs [[콘텐츠 원천:갱신 방식]]
const VERIFICATION_TOKEN = 'secret_test_verification_token';
const env: Env = {
  GITHUB_REPO: 'owner/repo',
  DISPATCH_EVENT_TYPE: 'notion-content-changed',
  GITHUB_DISPATCH_TOKEN: 'github-test-token',
  NOTION_VERIFICATION_TOKEN: VERIFICATION_TOKEN,
};

function signed(body: string, token = VERIFICATION_TOKEN): Request {
  return new Request('https://worker.test/', {
    method: 'POST',
    body,
    headers: {
      'X-Notion-Signature': `sha256=${createHmac('sha256', token).update(body).digest('hex')}`,
    },
  });
}

const event = JSON.stringify({ id: 'event-1', type: 'page.properties_updated' });

describe('handleRequest', () => {
  it('서명이 맞는 페이지 이벤트는 GitHub dispatch를 한 번 부른다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const response = await handleRequest(signed(event), env, fetchImpl);
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.github.com/repos/owner/repo/dispatches');
  });

  it('서명이 틀리면 거절하고 부르지 않는다', async () => {
    const fetchImpl = vi.fn();
    const response = await handleRequest(signed(event, 'wrong'), env, fetchImpl);
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('서명 헤더가 없으면 거절한다', async () => {
    const fetchImpl = vi.fn();
    const response = await handleRequest(
      new Request('https://worker.test/', { method: 'POST', body: event }),
      env,
      fetchImpl,
    );
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('상관없는 이벤트는 200으로 받고 아무것도 하지 않는다', async () => {
    const fetchImpl = vi.fn();
    const comment = JSON.stringify({ id: 'event-2', type: 'comment.created' });
    const response = await handleRequest(signed(comment), env, fetchImpl);
    expect(response.status).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('확인 요청은 토큰을 로그에 남기고 부르지 않는다', async () => {
    const fetchImpl = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = await handleRequest(
      new Request('https://worker.test/', {
        method: 'POST',
        body: JSON.stringify({ verification_token: 'secret_from_notion' }),
      }),
      { ...env, NOTION_VERIFICATION_TOKEN: undefined },
      fetchImpl,
    );
    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('secret_from_notion'));
    expect(fetchImpl).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('비밀 값이 없으면 500으로 돌려 재시도를 받는다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handleRequest(signed(event), {
      ...env,
      NOTION_VERIFICATION_TOKEN: undefined,
    });
    expect(response.status).toBe(500);
    error.mockRestore();
  });

  it('GitHub가 받지 않거나 닿지 않으면 502로 돌려 재시도를 받는다', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rejected = vi.fn().mockResolvedValue(new Response('bad', { status: 404 }));
    expect((await handleRequest(signed(event), env, rejected)).status).toBe(502);
    const unreachable = vi.fn().mockRejectedValue(new Error('network'));
    expect((await handleRequest(signed(event), env, unreachable)).status).toBe(502);
    error.mockRestore();
  });

  it('POST가 아니면 405, JSON이 아니면 400이다', async () => {
    expect((await handleRequest(new Request('https://worker.test/'), env)).status).toBe(405);
    const bad = new Request('https://worker.test/', { method: 'POST', body: 'not json' });
    expect((await handleRequest(bad, env)).status).toBe(400);
  });
});
