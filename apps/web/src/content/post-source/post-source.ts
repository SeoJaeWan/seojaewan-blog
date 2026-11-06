import 'server-only';

import { cache } from 'react';

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
import { type PostRow, toPostSummary } from '@/content/post-schema/post-schema';
import { env } from '@/env';
import { type PostBody, postBodySchema } from '@/shared/utils/post-body/post-body';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/** 글을 읽는 곳의 클라이언트와 데이터베이스 ID */
type ContentReader = {
  client: NotionClient;
  databaseIds: Readonly<Record<ContentCollection, string>>;
};

/**
 * 글 색인(blog 묶음의 공개 글의 제목, slug, 폴더 경로, 작성일)을 서버에서 읽는다. `app/`의 페이지가 읽어 shell에 넘긴다.
 * 서버에서만 읽어 Notion 토큰이 브라우저로 나가지 않게 한다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @returns 글 색인(최신순)
 */
export async function getPostIndex(): Promise<PostSummary[]> {
  return (await getContentRows('blog')).map(toPostSummary);
}

/**
 * blog 묶음의 글 하나의 본문을 서버에서 읽는다. 브라우저는 서버 경로(`app/api/posts/[slug]`)로 받는다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:결정]]
 * @param slug 글 slug
 * @returns 본문. 공개 글이 아니면 null
 */
export async function getPostBody(slug: string): Promise<PostBody | null> {
  return getContentBody('blog', slug);
}

/**
 * 묶음(`blog`, `project`, `about`)의 공개 행을 읽는다. 한 번 그리는 동안(요청 하나, 빌드 때는 페이지 하나) 같은 묶음은 한 번만
 * 읽는다(React `cache`). 글 주소 페이지가 색인과 본문을 함께 읽어도 데이터베이스를 두 번 조회하지 않게 하기 위해서다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 */
export const getContentRows = cache(readContentRows);

/**
 * 묶음의 공개 행을 읽는다. `CONTENT_SOURCE`가 고른 곳(Notion이나 fixture)에서 읽고 같은 변환을 지난다. 공개하지 않은 행은 빠진다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param collection 묶음
 * @returns 공개 행(최신순)
 */
async function readContentRows(collection: ContentCollection): Promise<PostRow[]> {
  const { client, databaseIds } = await getContentReader();
  return readPostRows(await readDatabasePages(client, databaseIds[collection]));
}

// 운영에서 이미지 크기를 묻는 함수. 동시 요청 수 제한이 프로세스 전체에 걸리도록 하나만 둔다.
const servedImageResolver = createServedImageResolver(createImageSizeReader());

/**
 * 묶음의 공개 항목 하나의 본문을 읽는다. Notion 블록을 본문 블록으로 바꾸고, 보내기 전에 코드 강조(Shiki)와 수식(KaTeX)을
 * 서버에서 처리하고, 이미지와 커버의 크기를 채운다.
 * @codocs [[콘텐츠 원천:결정]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[기술 스택:글 본문 처리]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @param collection 묶음
 * @param slug 항목 slug
 * @returns 본문. 공개 항목이 아니면 null
 */
export async function getContentBody(
  collection: ContentCollection,
  slug: string,
): Promise<PostBody | null> {
  const row = (await getContentRows(collection)).find((candidate) => candidate.slug === slug);
  if (row === undefined) {
    return null;
  }
  const { client } = await getContentReader();
  const blocks = await renderPostBlocks(toPostBlocks(await readBlockTree(client, row.pageId)));
  const body = await resolvePostImages(
    { blocks, cover: row.cover },
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
