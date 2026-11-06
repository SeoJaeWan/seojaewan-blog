import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { CONTENT_INDEX_TAG, getPageCacheTag } from '@/content/content-cache/content-cache';

import { decideNotionWebhook, verifyNotionSignature } from './notion-webhook';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const SECRET = 'secret_webhook_test_value';
const PAGE_ID = '153104cd-477e-809d-8dc4-ff2d96ae3090';

const pageEvent = JSON.stringify({
  id: 'event-1',
  timestamp: '2026-11-06T00:00:00.000Z',
  type: 'page.content_updated',
  entity: { id: PAGE_ID, type: 'page' },
  data: { parent: { id: 'database-1', type: 'database' }, updated_blocks: [] },
});

/**
 * Notion이 만드는 것과 같은 서명 머리 값을 만든다.
 * @param body 본문
 * @param secret 비밀값
 * @returns `sha256=<16진수>`
 */
function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

// @codocs [[콘텐츠 원천:갱신 방식]]
describe('콘텐츠 원천:갱신 방식', () => {
  it('받은 본문 그대로를 비밀값으로 서명한 값이면 맞는 서명이다', () => {
    expect(verifyNotionSignature(pageEvent, sign(pageEvent), SECRET)).toBe(true);
  });

  it('다른 비밀값, 바뀐 본문, 머리 없는 값, 빈 서명은 거부한다', () => {
    expect(verifyNotionSignature(pageEvent, sign(pageEvent, 'secret_other'), SECRET)).toBe(false);
    expect(verifyNotionSignature(`${pageEvent} `, sign(pageEvent), SECRET)).toBe(false);
    expect(verifyNotionSignature(pageEvent, sign(pageEvent).slice(7), SECRET)).toBe(false);
    expect(verifyNotionSignature(pageEvent, 'sha256=abc', SECRET)).toBe(false);
    expect(verifyNotionSignature(pageEvent, null, SECRET)).toBe(false);
  });

  it('서명이 맞으면 공개 여부를 보지 않고 목록과 바뀐 페이지의 태그를 다시 만든다', () => {
    expect(
      decideNotionWebhook({ body: pageEvent, signature: sign(pageEvent), secret: SECRET }),
    ).toEqual({
      status: 200,
      tags: [CONTENT_INDEX_TAG, getPageCacheTag(PAGE_ID)],
      alert: null,
    });
  });

  it('페이지가 아닌 대상(데이터 소스 등)이 바뀌면 목록만 다시 만든다', () => {
    const body = JSON.stringify({
      type: 'data_source.schema_updated',
      entity: { id: 'data-source-1', type: 'data_source' },
    });
    expect(decideNotionWebhook({ body, signature: sign(body), secret: SECRET }).tags).toEqual([
      CONTENT_INDEX_TAG,
    ]);
  });

  it('서명이 맞지 않으면 거절하고 아무것도 다시 만들지 않는다', () => {
    expect(decideNotionWebhook({ body: pageEvent, signature: sign('{}'), secret: SECRET })).toEqual(
      { status: 401, tags: [], alert: null },
    );
  });

  it('비밀값이 없으면 모든 갱신 요청을 거절하고 알린다', () => {
    const decision = decideNotionWebhook({
      body: pageEvent,
      signature: sign(pageEvent),
      secret: undefined,
    });
    expect(decision).toMatchObject({ status: 503, tags: [], alert: { level: 'error' } });
  });

  it('서명은 맞는데 읽을 수 없는 본문이면 실패로 알린다', () => {
    const body = '{"type":"page.content_updated"}';
    expect(decideNotionWebhook({ body, signature: sign(body), secret: SECRET })).toMatchObject({
      status: 400,
      tags: [],
      alert: { level: 'error' },
    });
  });
});

// @codocs [[콘텐츠 원천:연동 토큰]]
describe('콘텐츠 원천:연동 토큰', () => {
  const verification = JSON.stringify({ verification_token: 'secret_verification_value' });

  it('비밀값이 아직 없을 때의 확인 요청은 받고, 확인 토큰을 알림으로 보낸다', () => {
    expect(decideNotionWebhook({ body: verification, signature: null, secret: undefined })).toEqual(
      {
        status: 200,
        tags: [],
        alert: {
          title: 'Notion 웹훅 확인 토큰',
          message: 'secret_verification_value',
          level: 'warn',
        },
      },
    );
  });

  it('비밀값이 이미 있으면 확인 요청에 답만 하고 토큰을 보내지 않는다', () => {
    expect(decideNotionWebhook({ body: verification, signature: null, secret: SECRET })).toEqual({
      status: 200,
      tags: [],
      alert: null,
    });
  });
});
