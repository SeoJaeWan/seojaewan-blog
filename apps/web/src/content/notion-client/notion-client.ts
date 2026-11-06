import 'server-only';

import { z } from 'zod';

// fixture를 받는 스크립트(`scripts/fetch-notion-fixture.ts`)가 Node로 이 파일을 바로 읽는다.
// 그래서 이 파일은 `@/` 별칭 import 없이 패키지만 가져온다.

/**
 * 블로그가 쓰는 Notion API 버전. 운영 코드와 fixture를 받는 스크립트가 같은 버전으로 요청한다(데이터베이스 조회 응답 모양이 버전마다 다르다).
 * 2025-09-03부터 데이터베이스 행은 데이터베이스가 가진 데이터 소스(data source)를 조회해 읽는다.
 */
export const NOTION_API_VERSION = '2025-09-03';

/** Notion API 주소 */
const NOTION_API_ORIGIN = 'https://api.notion.com';

/** 한 번에 받는 행·블록 수. Notion API가 받는 가장 큰 값이다 */
const NOTION_PAGE_SIZE = 100;

/** 요청이 너무 많다(429)거나, 시간 안에 응답이 없거나, Notion 서버 오류(5xx)일 때 다시 보내는 횟수 */
const NOTION_RETRY_LIMIT = 3;

/** 기다릴 시간을 알려 주지 않은 429 응답 뒤와, 시간 초과·서버 오류 뒤 기다리는 시간(초) */
const NOTION_DEFAULT_RETRY_SECONDS = 1;

/**
 * 요청 하나가 응답을 기다리는 시간(밀리초). 응답이 오지 않는 요청에 내보내기가 오래 매이지 않게 짧게 끊고 다시 보낸다.
 * 예전에 빌드가 Notion을 읽을 때 응답이 오지 않는 요청 때문에 한 페이지가 60초를 넘긴 적이 있다.
 */
const NOTION_REQUEST_TIMEOUT_MS = 15_000;

// 다시 보내는 Notion 서버 오류 응답 코드다.
const retryableServerStatuses: ReadonlySet<number> = new Set([500, 502, 503, 504]);

/** 블로그가 Notion에 보내는 요청. 이어 받기 위치(`startCursor`)가 없으면 처음부터 받는다 */
export type NotionRequest =
  | { kind: 'retrieve-database'; databaseId: string }
  | { kind: 'query-data-source'; dataSourceId: string; startCursor: string | null }
  | { kind: 'list-block-children'; blockId: string; startCursor: string | null };

/**
 * Notion 클라이언트. 요청 하나에 Notion API 응답 JSON을 그대로(검증 전) 돌려준다.
 * 운영은 Notion API를 부르고(`createNotionHttpClient`), fixture 모드는 저장해 둔 응답을 돌려준다(`createNotionFixtureClient`).
 */
export type NotionClient = {
  request: (request: NotionRequest) => Promise<unknown>;
};

/** 블록 하나와 그 하위 블록. 블록은 Notion API 응답 그대로다 */
export type NotionBlockNode = {
  block: unknown;
  children: NotionBlockNode[];
};

// 목록 응답(데이터 소스 조회, 하위 블록 목록)에서 이어 받기에 필요한 부분
const listResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(z.unknown()),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});

// 데이터베이스 조회 응답에서 데이터 소스 ID
const databaseResponseSchema = z.object({
  object: z.literal('database'),
  data_sources: z.array(z.object({ id: z.string() })).min(1),
});

// 결과 행 가운데 페이지
const pageObjectSchema = z.object({ object: z.literal('page') });

// 하위 블록을 따라 내려갈지 정하는 데 필요한 부분
const blockHeadSchema = z.object({
  object: z.literal('block'),
  id: z.string(),
  type: z.string(),
  has_children: z.boolean(),
});

// 하위 블록이 있어도 내려가지 않는 블록. 하위 페이지와 데이터베이스는 본문이 아니다.
const SKIPPED_CHILDREN_TYPES = ['child_page', 'child_database'] as const;

// Notion 오류 응답에서 알리는 부분
const errorResponseSchema = z.object({ code: z.string(), message: z.string() });

/**
 * 요청의 이름. fixture는 응답을 이 이름으로 저장하고 찾는다.
 * @param request 요청
 * @returns `GET /v1/blocks/<id>/children?start_cursor=<위치>`처럼 메서드와 경로
 */
export function getNotionRequestKey(request: NotionRequest): string {
  const { method, path } = toHttpRequest(request);
  const cursor = 'startCursor' in request ? request.startCursor : null;
  return cursor === null ? `${method} ${path}` : `${method} ${path}?start_cursor=${cursor}`;
}

/**
 * Notion API를 부르는 클라이언트를 만든다. 토큰은 요청 머리에만 넣고 오류 메시지에 넣지 않는다.
 * 요청이 너무 많다(429)는 응답은 알려 준 시간만큼 기다렸다가 다시 보낸다.
 * 정한 시간(15초) 안에 응답이 없거나 연결이 끊기거나 Notion 서버 오류(5xx)면 1초 기다렸다가 다시 보낸다(최대 3번).
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @param token Notion 연동 토큰
 * @returns Notion 클라이언트
 */
export function createNotionHttpClient(token: string): NotionClient {
  return {
    async request(request) {
      const { method, path } = toHttpRequest(request);
      const url = new URL(path, NOTION_API_ORIGIN);
      let body: string | undefined;
      if (request.kind === 'list-block-children') {
        url.searchParams.set('page_size', String(NOTION_PAGE_SIZE));
        if (request.startCursor !== null) {
          url.searchParams.set('start_cursor', request.startCursor);
        }
      }
      if (request.kind === 'query-data-source') {
        body = JSON.stringify({
          page_size: NOTION_PAGE_SIZE,
          ...(request.startCursor === null ? {} : { start_cursor: request.startCursor }),
        });
      }
      for (let attempt = 0; ; attempt += 1) {
        const canRetry = attempt < NOTION_RETRY_LIMIT;
        let response: Response;
        try {
          response = await fetch(url, {
            method,
            body,
            headers: {
              Authorization: `Bearer ${token}`,
              'Notion-Version': NOTION_API_VERSION,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(NOTION_REQUEST_TIMEOUT_MS),
          });
        } catch (error) {
          if (!canRetry) {
            const reason =
              error instanceof Error || error instanceof DOMException ? error.name : 'unknown';
            throw new Error(
              `[notion] ${getNotionRequestKey(request)} 요청에 응답이 없다(${reason})`,
            );
          }
          await wait(NOTION_DEFAULT_RETRY_SECONDS);
          continue;
        }
        if (response.status === 429 && canRetry) {
          await wait(Number(response.headers.get('Retry-After') ?? NOTION_DEFAULT_RETRY_SECONDS));
          continue;
        }
        if (retryableServerStatuses.has(response.status) && canRetry) {
          await wait(NOTION_DEFAULT_RETRY_SECONDS);
          continue;
        }
        const json: unknown = await response.json();
        if (!response.ok) {
          const error = errorResponseSchema.safeParse(json);
          const reason = error.success ? `${error.data.code}: ${error.data.message}` : '';
          throw new Error(
            `[notion] ${getNotionRequestKey(request)} 요청이 실패했다(${String(response.status)}) ${reason}`,
          );
        }
        return json;
      }
    },
  };
}

/**
 * 데이터베이스의 모든 행(페이지)을 읽는다. 데이터베이스의 첫 데이터 소스를 끝까지 이어 받는다.
 * 공개 여부는 여기서 거르지 않는다. 공개 여부와 필수 값은 변환(`toContentRows`)이 본다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @param client Notion 클라이언트
 * @param databaseId 데이터베이스 ID
 * @returns 행(Notion 페이지 응답 그대로)
 */
export async function readDatabasePages(
  client: NotionClient,
  databaseId: string,
): Promise<unknown[]> {
  const database = databaseResponseSchema.parse(
    await client.request({ kind: 'retrieve-database', databaseId }),
  );
  const [dataSource] = database.data_sources;
  if (dataSource === undefined) {
    return [];
  }
  const results = await readList((startCursor) =>
    client.request({ kind: 'query-data-source', dataSourceId: dataSource.id, startCursor }),
  );
  return results.filter((result) => pageObjectSchema.safeParse(result).success);
}

/**
 * 페이지(또는 블록)의 하위 블록을 하위 블록까지 모두 읽는다. 하위 페이지와 데이터베이스 안으로는 내려가지 않는다.
 * Notion이 한꺼번에 많은 요청을 막으므로 차례대로 읽는다.
 * @codocs [[Notion 블록:지원 블록]]
 * @param client Notion 클라이언트
 * @param blockId 페이지 ID나 블록 ID
 * @returns 하위 블록 나무
 */
export async function readBlockTree(
  client: NotionClient,
  blockId: string,
): Promise<NotionBlockNode[]> {
  const blocks = await readList((startCursor) =>
    client.request({ kind: 'list-block-children', blockId, startCursor }),
  );
  const nodes: NotionBlockNode[] = [];
  for (const block of blocks) {
    const head = blockHeadSchema.parse(block);
    const shouldReadChildren =
      head.has_children && !SKIPPED_CHILDREN_TYPES.some((type) => type === head.type);
    nodes.push({ block, children: shouldReadChildren ? await readBlockTree(client, head.id) : [] });
  }
  return nodes;
}

/**
 * 목록 응답을 끝까지 이어 받아 결과를 모은다.
 * @param requestPage 이어 받기 위치로 목록 한 쪽을 받는 함수
 * @returns 모든 결과
 */
async function readList(
  requestPage: (startCursor: string | null) => Promise<unknown>,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let startCursor: string | null = null;
  do {
    const list = listResponseSchema.parse(await requestPage(startCursor));
    results.push(...list.results);
    startCursor = list.has_more ? list.next_cursor : null;
  } while (startCursor !== null);
  return results;
}

/**
 * 요청을 HTTP 메서드와 경로로 바꾼다.
 * @param request 요청
 * @returns 메서드와 경로
 */
function toHttpRequest(request: NotionRequest): { method: 'GET' | 'POST'; path: string } {
  switch (request.kind) {
    case 'retrieve-database':
      return { method: 'GET', path: `/v1/databases/${request.databaseId}` };
    case 'query-data-source':
      return { method: 'POST', path: `/v1/data_sources/${request.dataSourceId}/query` };
    case 'list-block-children':
      return { method: 'GET', path: `/v1/blocks/${request.blockId}/children` };
  }
}

/**
 * 정한 시간만큼 기다린다.
 * @param seconds 기다릴 시간(초)
 * @returns 기다린 뒤 끝나는 Promise
 */
function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}
