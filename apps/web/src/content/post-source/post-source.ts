import 'server-only';

import {
  type ContentCollection,
  NOTION_DATABASE_IDS,
  NOTION_FIXTURE_DATABASE_IDS,
} from '@/content/content-collections/content-collections';
import { createImageSizeReader } from '@/content/image-size/image-size';
import { toPostBlocks } from '@/content/notion-blocks/notion-blocks';
import {
  createNotionHttpClient,
  type NotionClient,
  readBlockTree,
  readDatabasePages,
} from '@/content/notion-client/notion-client';
import { loadNotionFixtureClient } from '@/content/notion-fixture/notion-fixture';
import { readPostRows } from '@/content/notion-rows/notion-rows';
import { renderPostBlocks } from '@/content/post-body-render/post-body-render';
import {
  createServedImageResolver,
  type ImageResolver,
  resolvePostImages,
} from '@/content/post-images/post-images';
import type { PostRow } from '@/content/post-schema/post-schema';
import { env } from '@/env';
import { type PostBody, postBodySchema } from '@/shared/utils/post-body/post-body';

/** 본문을 읽을 공개 행의 부분. 페이지 ID와 커버다 */
export type PageSource = Pick<PostRow, 'pageId' | 'cover'>;

/** 글을 읽는 곳의 클라이언트와 데이터베이스 ID */
type ContentReader = {
  client: NotionClient;
  databaseIds: Readonly<Record<ContentCollection, string>>;
};

/**
 * 묶음(`blog`, `project`, `about`)의 공개 행을 읽는다. `CONTENT_SOURCE`가 고른 곳(Notion이나 fixture)에서 읽고 같은 변환을 지난다.
 * 공개하지 않은 행은 빠진다. 캐시하지 않는다. 앱은 태그를 붙여 캐시하는 `content-cache`로 읽는다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param collection 묶음
 * @returns 공개 행(최신순)
 */
export async function readContentRows(collection: ContentCollection): Promise<PostRow[]> {
  const { client, databaseIds } = await getContentReader();
  return readPostRows(await readDatabasePages(client, databaseIds[collection]));
}

// 운영에서 이미지 크기를 묻는 함수. 동시 요청 수 제한이 프로세스 전체에 걸리도록 하나만 둔다.
const servedImageResolver = createServedImageResolver(createImageSizeReader());

/**
 * 공개 행 하나(Notion 페이지)의 본문을 읽는다. Notion 블록을 본문 블록으로 바꾸고, 보내기 전에 코드 강조(Shiki)와 수식(KaTeX)을
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
  const { client } = await getContentReader();
  const blocks = await renderPostBlocks(toPostBlocks(await readBlockTree(client, pageId)));
  const body = await resolvePostImages(
    { blocks, cover },
    { resolveImage: await getImageResolver() },
  );
  return postBodySchema.parse(body);
}

/**
 * `CONTENT_SOURCE`대로 이미지 크기를 받는 곳을 고른다. 운영은 이미지 서버에 묻고, fixture는 이미지 서버가 없으므로
 * 저장소 안의 시험 이미지로 바꾼다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @returns 이미지 바꾸기
 */
async function getImageResolver(): Promise<ImageResolver> {
  if (env.CONTENT_SOURCE === 'fixture') {
    const { createFixtureImageResolver } =
      await import('@/content/notion-fixture/notion-fixture-image');
    return createFixtureImageResolver();
  }
  return servedImageResolver;
}

/**
 * `CONTENT_SOURCE`대로 글을 읽는 곳을 고른다. Notion이 안 될 때 fixture로 바꾸지 않는다.
 * fixture는 저장한 응답을 돌려주는 가짜 클라이언트와 시험용 데이터베이스 ID다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @returns 클라이언트와 데이터베이스 ID
 */
async function getContentReader(): Promise<ContentReader> {
  if (env.CONTENT_SOURCE === 'fixture') {
    return { client: await loadNotionFixtureClient(), databaseIds: NOTION_FIXTURE_DATABASE_IDS };
  }
  if (env.NOTION_TOKEN === undefined) {
    throw new Error('[content] NOTION_TOKEN이 없다');
  }
  return { client: createNotionHttpClient(env.NOTION_TOKEN), databaseIds: NOTION_DATABASE_IDS };
}
