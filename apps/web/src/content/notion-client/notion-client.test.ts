import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createNotionHttpClient,
  getNotionRequestKey,
  NOTION_API_VERSION,
  type NotionClient,
  type NotionRequest,
  readBlockTree,
  readDatabasePages,
} from './notion-client';

vi.mock('server-only', () => ({}));

const TOKEN = 'ntn_test_token_value';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * 요청 이름마다 정한 응답을 돌려주는 클라이언트를 만든다.
 * @param responses 요청 이름마다의 응답
 * @returns 클라이언트와 받은 요청 이름
 */
function stubClient(responses: Record<string, unknown>): {
  client: NotionClient;
  requests: string[];
} {
  const requests: string[] = [];
  return {
    requests,
    client: {
      request(request: NotionRequest) {
        const key = getNotionRequestKey(request);
        requests.push(key);
        return Promise.resolve(responses[key]);
      },
    },
  };
}

/**
 * 목록 응답을 만든다.
 * @param results 결과
 * @param nextCursor 다음 쪽 위치. 없으면 마지막 쪽이다
 * @returns 목록 응답
 */
function list(results: unknown[], nextCursor: string | null = null): unknown {
  return { object: 'list', results, has_more: nextCursor !== null, next_cursor: nextCursor };
}

/**
 * 블록 응답을 만든다.
 * @param id 블록 ID
 * @param type 블록 종류
 * @param hasChildren 하위 블록이 있는지
 * @returns 블록 응답
 */
function block(id: string, type: string, hasChildren = false): unknown {
  return { object: 'block', id, type, has_children: hasChildren };
}

// @codocs [[콘텐츠 원천:데이터베이스]]
describe('콘텐츠 원천:데이터베이스', () => {
  it('데이터베이스의 데이터 소스를 끝까지 이어 받아 행(페이지)만 돌려준다', async () => {
    const { client, requests } = stubClient({
      'GET /v1/databases/db': { object: 'database', data_sources: [{ id: 'ds' }] },
      'POST /v1/data_sources/ds/query': list([{ object: 'page', id: 'a' }], 'next'),
      'POST /v1/data_sources/ds/query?start_cursor=next': list([
        { object: 'page', id: 'b' },
        { object: 'data_source', id: 'nested' },
      ]),
    });
    expect(await readDatabasePages(client, 'db')).toEqual([
      { object: 'page', id: 'a' },
      { object: 'page', id: 'b' },
    ]);
    expect(requests).toEqual([
      'GET /v1/databases/db',
      'POST /v1/data_sources/ds/query',
      'POST /v1/data_sources/ds/query?start_cursor=next',
    ]);
  });
});

// @codocs [[Notion 블록:지원 블록]]
describe('Notion 블록:지원 블록', () => {
  it('하위 블록을 끝까지 이어 받고, 하위 블록이 있는 블록은 그 안까지 읽는다', async () => {
    const { client } = stubClient({
      'GET /v1/blocks/page/children': list([block('list', 'bulleted_list_item', true)], 'next'),
      'GET /v1/blocks/page/children?start_cursor=next': list([block('p', 'paragraph')]),
      'GET /v1/blocks/list/children': list([block('child', 'bulleted_list_item')]),
    });
    expect(await readBlockTree(client, 'page')).toEqual([
      {
        block: block('list', 'bulleted_list_item', true),
        children: [{ block: block('child', 'bulleted_list_item'), children: [] }],
      },
      { block: block('p', 'paragraph'), children: [] },
    ]);
  });

  it('하위 페이지와 데이터베이스 안으로는 내려가지 않는다', async () => {
    const { client, requests } = stubClient({
      'GET /v1/blocks/page/children': list([
        block('sub', 'child_page', true),
        block('db', 'child_database', true),
      ]),
    });
    expect(await readBlockTree(client, 'page')).toHaveLength(2);
    expect(requests).toEqual(['GET /v1/blocks/page/children']);
  });
});

// @codocs [[콘텐츠 원천:읽는 곳]]
describe('콘텐츠 원천:읽는 곳', () => {
  it('Notion API에 정한 API 버전과 토큰으로 요청한다', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(list([]))));
    vi.stubGlobal('fetch', fetchMock);
    await createNotionHttpClient(TOKEN).request({
      kind: 'query-data-source',
      dataSourceId: 'ds',
      startCursor: 'next',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.notion.com/v1/data_sources/ds/query'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ page_size: 100, start_cursor: 'next' }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
          'Notion-Version': NOTION_API_VERSION,
        }) as unknown,
      }),
    );
  });

  it('요청이 너무 많다(429)는 응답은 알려 준 시간만큼 기다렸다가 다시 보낸다', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(Response.json(list([])));
    vi.stubGlobal('fetch', fetchMock);
    const response = createNotionHttpClient(TOKEN).request({
      kind: 'list-block-children',
      blockId: 'page',
      startCursor: null,
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await response).toEqual(list([]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('실패한 요청은 Notion 오류를 알리고 토큰은 알리지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { object: 'error', code: 'unauthorized', message: 'API token is invalid.' },
            { status: 401 },
          ),
        ),
      ),
    );
    const request = createNotionHttpClient(TOKEN).request({
      kind: 'retrieve-database',
      databaseId: 'db',
    });
    await expect(request).rejects.toThrow('GET /v1/databases/db 요청이 실패했다(401) unauthorized');
    await expect(request).rejects.not.toThrow(TOKEN);
  });
});
