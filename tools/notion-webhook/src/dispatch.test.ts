import { describe, expect, it } from 'vitest';

import { buildDispatchRequest, shouldDispatch } from './dispatch.ts';

// @codocs [[콘텐츠 원천:갱신 방식]]
describe('shouldDispatch', () => {
  it.each([
    'page.created',
    'page.content_updated',
    'page.properties_updated',
    'page.deleted',
    'page.undeleted',
    'page.moved',
  ])('%s는 시작한다', (type) => {
    expect(shouldDispatch(type)).toBe(true);
  });

  it.each(['comment.created', 'data_source.schema_updated', 'page.locked', 'database.created', ''])(
    '%s는 넘긴다',
    (type) => {
      expect(shouldDispatch(type)).toBe(false);
    },
  );

  it('문자열이 아니면 넘긴다', () => {
    expect(shouldDispatch(undefined)).toBe(false);
    expect(shouldDispatch(1)).toBe(false);
  });
});

// 요청 본문(JSON 문자열)을 읽는다
function parseBody(init: RequestInit): Record<string, unknown> {
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('buildDispatchRequest', () => {
  it('repository_dispatch 요청을 만든다', () => {
    const { url, init } = buildDispatchRequest(
      { repo: 'owner/repo', token: 'test-token', eventType: 'notion-content-changed' },
      { type: 'page.created', id: 'event-1' },
    );
    expect(url).toBe('https://api.github.com/repos/owner/repo/dispatches');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      Accept: 'application/vnd.github+json',
      'User-Agent': 'seojaewan-notion-webhook',
    });
    expect(parseBody(init)).toEqual({
      event_type: 'notion-content-changed',
      client_payload: { notion_event_type: 'page.created', notion_event_id: 'event-1' },
    });
  });

  it('이벤트 id가 없으면 client_payload에 넣지 않는다', () => {
    const { init } = buildDispatchRequest(
      { repo: 'owner/repo', token: 't', eventType: 'e' },
      { type: 'page.deleted' },
    );
    expect(parseBody(init)['client_payload']).toEqual({
      notion_event_type: 'page.deleted',
    });
  });
});
