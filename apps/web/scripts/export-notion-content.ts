// @codocs [[콘텐츠 원천:결정]]
// @codocs [[콘텐츠 원천:갱신 방식]]
// 운영 Notion의 세 묶음(blog·project·about)에서 공개 행과 본문을 읽고, 이미지 크기를 이미지 서버에 물어
// `apps/web/content/notion.json`에 저장한다. 빌드는 이 파일만 읽고 Notion을 부르지 않는다.
// 같은 Notion 내용이면 같은 파일이 나온다(행 차례, 키 차례, 서명 주소를 다듬는다). 그래서 diff에는 실제로 바뀐 것만 보인다.
// 비공개 행(초안)은 넣지 않아 초안만 바뀌면 파일도 바뀌지 않는다.
//
// 실행: `NOTION_TOKEN=<토큰> pnpm --filter @seojaewan/web export:notion-content`
//   또는 `pnpm --filter @seojaewan/web export:notion-content --token-file <토큰 파일>`
// 토큰은 출력하지 않는다. 행·이미지 수와 저장한 파일만 알린다.
// 이미지 서버가 답하지 않으면 그 이미지 크기는 null로 두고 경고한다. 이전 파일에서 이미 받은 크기는 다시 묻지 않는다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { NOTION_DATABASE_IDS } from '../src/content/content-collections/content-collections.ts';
import { createImageSizeReader } from '../src/content/image-size/image-size.ts';
import { createNotionHttpClient } from '../src/content/notion-client/notion-client.ts';
import {
  fillImageSizes,
  formatNotionExport,
  listImageAddresses,
  NOTION_EXPORT_PATH,
  type NotionExport,
  notionExportSchema,
  readNotionExport,
} from '../src/content/notion-export/notion-export.ts';

/** 저장할 파일 */
const outputPath = fileURLToPath(new URL(`../${NOTION_EXPORT_PATH}`, import.meta.url));

const { values } = parseArgs({ options: { 'token-file': { type: 'string' } } });
const tokenFile = values['token-file'];
const token =
  tokenFile === undefined
    ? process.env.NOTION_TOKEN?.trim()
    : readFileSync(tokenFile, 'utf8').trim();
if (token === undefined || token === '') {
  throw new Error('NOTION_TOKEN 환경 변수나 --token-file로 Notion 토큰을 준다');
}

const content = await readNotionExport(createNotionHttpClient(token), NOTION_DATABASE_IDS);
const addresses = listImageAddresses(content);
const imageSizes = await fillImageSizes(
  addresses,
  readPrevious()?.imageSizes ?? {},
  createImageSizeReader(),
);
writeFileSync(outputPath, formatNotionExport({ ...content, imageSizes }));

const pageCount = Object.values(content.pages).flat().length;
const unsizedCount = Object.values(imageSizes).filter((size) => size === null).length;
console.log(
  `공개 행 ${String(pageCount)}개, 이미지 ${String(addresses.length)}개(크기 없음 ${String(unsizedCount)}개)를 저장했다: ${outputPath}`,
);

/**
 * 이전에 저장한 파일을 읽는다. 없거나 모양이 맞지 않으면 없는 것으로 본다(크기를 모두 다시 묻는다).
 * @returns 이전 내보낸 글. 없으면 null
 */
function readPrevious(): NotionExport | null {
  if (!existsSync(outputPath)) {
    return null;
  }
  try {
    const result = notionExportSchema.safeParse(JSON.parse(readFileSync(outputPath, 'utf8')));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
