import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NOTION_FIXTURE_DATABASE_IDS } from '@/content/content-collections/content-collections';
import { toPostBlocks } from '@/content/notion-blocks/notion-blocks';
import {
  type NotionExport,
  notionExportSchema,
  readNotionExport,
} from '@/content/notion-export/notion-export';
import { loadNotionFixtureClient } from '@/content/notion-fixture/notion-fixture';
import { readPostRows } from '@/content/notion-rows/notion-rows';
import { renderPostBlocks } from '@/content/post-body-render/post-body-render';
import {
  createExportedImageResolver,
  type ImageResolver,
  resolvePostImages,
} from '@/content/post-images/post-images';
import type { PostRow } from '@/content/post-schema/post-schema';
import { env } from '@/env';
import type { PostCollection } from '@/shared/utils/post-address/post-address';
import { type PostBody, postBodySchema } from '@/shared/utils/post-body/post-body';

/** 본문을 읽을 공개 행의 부분. 페이지 ID와 커버다 */
export type PageSource = Pick<PostRow, 'pageId' | 'cover'>;

// 한 프로세스(빌드 작업자)에서 내보낸 글을 한 번만 읽는다.
let notionExport: Promise<NotionExport> | undefined;

/**
 * 묶음(`blog`, `project`, `about`)의 공개 행을 읽는다. `CONTENT_SOURCE`가 고른 곳(저장소의 글 JSON이나 fixture)에서 읽고 같은 변환을 지난다.
 * 공개하지 않은 행은 빠진다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param collection 묶음
 * @returns 공개 행(최신순)
 */
export async function readContentRows(collection: PostCollection): Promise<PostRow[]> {
  return readPostRows((await loadNotionExport()).pages[collection]);
}

/**
 * 공개 행 하나(Notion 페이지)의 본문을 읽는다. Notion 블록을 본문 블록으로 바꾸고, 코드 강조(Shiki)와 수식(KaTeX)을
 * 서버에서 처리하고, 이미지와 커버의 크기를 채운다. 공개 여부는 보지 않는다. 공개 행만 넘긴다.
 * @codocs [[콘텐츠 원천:결정]]
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[기술 스택:글 본문 처리]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @param page 공개 행의 페이지 ID와 커버
 * @param page.pageId Notion 페이지 ID
 * @param page.cover 커버의 이미지 서버 주소. 없으면 null
 * @returns 본문
 */
export async function readPageBody({ pageId, cover }: PageSource): Promise<PostBody> {
  const content = await loadNotionExport();
  const tree = content.blocks[pageId];
  if (tree === undefined) {
    throw new Error(`[content] 내보낸 글 JSON에 페이지 ${pageId}의 본문이 없다`);
  }
  const blocks = await renderPostBlocks(toPostBlocks(tree));
  const body = await resolvePostImages({ blocks, cover }, await getImageResolver(content));
  return postBodySchema.parse(body);
}

/**
 * `CONTENT_SOURCE`대로 내보낸 글을 읽는다. 다른 곳으로 조용히 바꾸지 않는다.
 * - `notion`(기본): 운영 Notion을 내보내 저장소에 커밋한 JSON(`apps/web/content/notion.json`)이다. 빌드는 Notion을 부르지 않는다.
 * - `fixture`: 저장한 시험 응답을 돌려주는 가짜 클라이언트에서 내보내기와 같은 함수로 읽는다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @returns 내보낸 글
 */
function loadNotionExport(): Promise<NotionExport> {
  notionExport ??= env.CONTENT_SOURCE === 'fixture' ? readFixtureExport() : readCommittedExport();
  return notionExport;
}

/**
 * fixture 응답을 내보내기와 같은 함수로 읽는다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @returns 내보낸 글(이미지 크기는 비어 있다)
 */
async function readFixtureExport(): Promise<NotionExport> {
  return readNotionExport(await loadNotionFixtureClient(), NOTION_FIXTURE_DATABASE_IDS);
}

/**
 * 저장소에 커밋한 글 JSON(`NOTION_EXPORT_PATH`)을 읽는다. 빌드는 `apps/web`에서 돌므로 그 아래의 경로로 읽는다.
 * @codocs [[콘텐츠 원천:결정]]
 * @returns 내보낸 글
 */
async function readCommittedExport(): Promise<NotionExport> {
  // `NOTION_EXPORT_PATH`와 같은 경로다. 빌드 도구가 읽는 파일을 그 폴더로 좁혀 알 수 있게 경로를 글자로 쓴다.
  const file = path.join(process.cwd(), 'content', 'notion.json');
  return notionExportSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

/**
 * `CONTENT_SOURCE`대로 이미지 크기를 받는 곳을 고른다. 운영은 내보낸 JSON의 크기를 쓰고, fixture는 이미지 서버가 없으므로
 * 저장소 안의 시험 이미지로 바꾼다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @param content 내보낸 글
 * @returns 이미지 바꾸기
 */
async function getImageResolver(content: NotionExport): Promise<ImageResolver> {
  if (env.CONTENT_SOURCE === 'fixture') {
    const { createFixtureImageResolver } =
      await import('@/content/notion-fixture/notion-fixture-image');
    return createFixtureImageResolver();
  }
  return createExportedImageResolver(content.imageSizes);
}
