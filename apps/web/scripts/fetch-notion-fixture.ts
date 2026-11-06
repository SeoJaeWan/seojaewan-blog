// @codocs [[콘텐츠 원천:읽는 곳]]
// 시험용 Notion 페이지와 그 안의 데이터베이스 세 개(blog·project·about)를 Notion API로 한 번 받아
// `src/content/notion-fixture/notion-responses.json`에 응답 그대로 저장한다. fixture 모드의 가짜 클라이언트가 이 파일을 돌려준다.
// 운영 코드와 같은 클라이언트·API 버전·읽기 함수로 받아, 운영이 보낼 요청과 같은 이름으로 저장된다.
//
// 실행: `NOTION_TOKEN=<토큰> pnpm --filter @seojaewan/web fetch:notion-fixture`
//   또는 `pnpm --filter @seojaewan/web fetch:notion-fixture --token-file <토큰 파일>`
// 토큰은 출력하지 않는다. 받은 요청 수와 저장한 파일만 알린다.
//
// 저장할 때 바꾸는 것
// - 이미지 주소: 만료되는 Notion 주소(`file.url`)와 외부 주소(`external.url`)를 저장소 안의 시험 이미지로 바꾼다.
// - 요청마다 바뀌는 `request_id`는 지운다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';

import {
  NOTION_FIXTURE_DATABASE_IDS,
  NOTION_FIXTURE_PAGE_ID,
} from '../src/content/content-collections/content-collections.ts';
import {
  createNotionHttpClient,
  getNotionRequestKey,
  type NotionClient,
  readBlockTree,
  readDatabasePages,
} from '../src/content/notion-client/notion-client.ts';

/** 저장할 파일 */
const outputFile = new URL('../src/content/notion-fixture/notion-responses.json', import.meta.url);

/** 이미지 주소 대신 넣는 저장소 안의 시험 이미지 */
const TEST_IMAGE_PATH = 'apps/web/src/content/notion-fixture/notion-test-image.png';

const { values } = parseArgs({ options: { 'token-file': { type: 'string' } } });
const tokenFile = values['token-file'];
const token =
  tokenFile === undefined
    ? process.env.NOTION_TOKEN?.trim()
    : readFileSync(tokenFile, 'utf8').trim();
if (token === undefined || token === '') {
  throw new Error('NOTION_TOKEN 환경 변수나 --token-file로 Notion 토큰을 준다');
}

const responses: Record<string, unknown> = {};
const client = recordingClient(createNotionHttpClient(token), responses);

await readBlockTree(client, NOTION_FIXTURE_PAGE_ID);
for (const databaseId of Object.values(NOTION_FIXTURE_DATABASE_IDS)) {
  for (const page of await readDatabasePages(client, databaseId)) {
    await readBlockTree(client, pageIdOf(page));
  }
}

const sorted = Object.fromEntries(Object.entries(responses).sort(([a], [b]) => a.localeCompare(b)));
// 저장소의 Prettier 설정으로 맞춰 저장해 `pnpm format:check`를 지나게 한다.
const outputPath = fileURLToPath(outputFile);
const prettierConfig = await resolveConfig(outputPath);
writeFileSync(
  outputFile,
  await format(JSON.stringify(toSavedValue(sorted)), { ...prettierConfig, filepath: outputPath }),
);
console.log(`요청 ${String(Object.keys(sorted).length)}개의 응답을 저장했다: ${outputPath}`);

/**
 * 받은 응답을 요청 이름마다 모으는 클라이언트로 감싼다.
 * @param inner 실제 Notion 클라이언트
 * @param store 응답을 모을 곳
 * @returns 감싼 클라이언트
 */
function recordingClient(inner: NotionClient, store: Record<string, unknown>): NotionClient {
  return {
    async request(request) {
      const response = await inner.request(request);
      store[getNotionRequestKey(request)] = response;
      return response;
    },
  };
}

/**
 * 행(페이지)의 ID.
 * @param page 페이지 응답
 * @returns 페이지 ID
 */
function pageIdOf(page: unknown): string {
  if (typeof page === 'object' && page !== null && 'id' in page && typeof page.id === 'string') {
    return page.id;
  }
  throw new Error('페이지 ID가 없는 행이다');
}

/**
 * 저장할 응답을 만든다. 요청마다 바뀌는 `request_id`를 지우고, 파일(`{ type: 'file', file: { url } }`)과
 * 외부 파일(`{ type: 'external', external: { url } }`)의 주소를 시험 이미지로 바꾼다.
 * 페이지 주소와 북마크 주소는 이 모양이 아니라 그대로 남는다.
 * @param value 응답(또는 그 일부)
 * @returns 저장할 값
 */
function toSavedValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSavedValue);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const entries = Object.entries(value)
    .filter(([key]) => key !== 'request_id')
    .map(([key, child]) => [key, toSavedValue(child)] as const);
  const saved: Record<string, unknown> = Object.fromEntries(entries);
  const type = saved.type;
  if (type === 'file' || type === 'external') {
    const file = saved[type];
    if (typeof file === 'object' && file !== null && 'url' in file) {
      saved[type] = { ...file, url: TEST_IMAGE_PATH };
    }
  }
  return saved;
}
