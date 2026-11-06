import { createHmac } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTENT_INDEX_TAG, getPageCacheTag } from '@/content/content-cache/content-cache';

import { POST } from './route';

const SECRET = 'secret_route_test_value';
const PAGE_ID = '153104cd-477e-809d-8dc4-ff2d96ae3090';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/env', () => ({
  env: { CONTENT_SOURCE: 'fixture', NOTION_WEBHOOK_SECRET: 'secret_route_test_value' },
}));

beforeEach(() => {
  vi.mocked(revalidateTag).mockReset();
  vi.mocked(after).mockClear();
});

/**
 * 서명한 웹훅 요청을 보낸다.
 * @param body 본문
 * @param signature 서명 머리 값. 주지 않으면 맞는 서명이다
 * @returns 응답
 */
function send(body: string, signature?: string): Promise<Response> {
  const value = signature ?? `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;
  return POST(
    new Request('http://localhost/api/notion-webhook', {
      method: 'POST',
      body,
      headers: { 'X-Notion-Signature': value },
    }),
  );
}

const pageEvent = JSON.stringify({
  type: 'page.properties_updated',
  entity: { id: PAGE_ID, type: 'page' },
});

// @codocs [[콘텐츠 원천:갱신 방식]]
describe('콘텐츠 원천:갱신 방식', () => {
  it('서명이 맞으면 목록과 바뀐 페이지의 태그를 바로 만료시킨다', async () => {
    expect((await send(pageEvent)).status).toBe(200);
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([
      [CONTENT_INDEX_TAG, { expire: 0 }],
      [getPageCacheTag(PAGE_ID), { expire: 0 }],
    ]);
    expect(after).not.toHaveBeenCalled();
  });

  it('서명이 맞지 않으면 401이고 태그를 건드리지 않는다', async () => {
    expect((await send(pageEvent, 'sha256=00')).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('다시 만들다 실패하면 500으로 답하고 응답을 보낸 뒤 알린다', async () => {
    vi.mocked(revalidateTag).mockImplementation(() => {
      throw new Error('cache');
    });
    expect((await send(pageEvent)).status).toBe(500);
    expect(after).toHaveBeenCalledTimes(1);
  });
});
