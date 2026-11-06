import 'server-only';

import { type PostRow, toPostSummary } from '@/content/post-schema/post-schema';
import { type PageSource, readContentRows, readPageBody } from '@/content/post-source/post-source';
import {
  POST_COLLECTIONS,
  type PostCollection,
  type PostRef,
} from '@/shared/utils/post-address/post-address';
import type { PostBody } from '@/shared/utils/post-body/post-body';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/** 묶음과 그 묶음의 공개 행 하나 */
export type ContentRow = {
  collection: PostCollection;
  row: PostRow;
};

// 페이지 ID마다 만든 본문. 빌드할 때 글 페이지, 메타 정보, 본문 경로가 같은 본문을 읽어도 코드 강조와 수식을 한 번만 처리한다.
const pageBodies = new Map<string, Promise<PostBody>>();

/**
 * 세 묶음의 공개 항목 색인. 작업 공간(바탕화면 폴더, 탐색기, 검색, Chrome)이 쓴다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @returns 색인(묶음 차례, 묶음 안은 최신순)
 */
export async function getContentIndex(): Promise<PostSummary[]> {
  return (await getContentRows()).map(({ collection, row }) => toPostSummary(row, collection));
}

/**
 * 세 묶음의 공개 행. sitemap이 쓴다.
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @returns 묶음과 공개 행(묶음 차례, 묶음 안은 최신순)
 */
export async function getContentRows(): Promise<ContentRow[]> {
  const rowsByCollection = await Promise.all(POST_COLLECTIONS.map(readContentRows));
  return POST_COLLECTIONS.flatMap((collection, index) =>
    (rowsByCollection[index] ?? []).map((row) => ({ collection, row })),
  );
}

/**
 * 공개 항목 하나의 행(제목, Summary, 커버 등). 글 주소 페이지의 메타 정보가 쓴다.
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @param post 항목(묶음과 slug)
 * @returns 공개 행. 공개 항목이 아니면 null
 */
export async function getContentRow(post: PostRef): Promise<PostRow | null> {
  return (await readContentRows(post.collection)).find((row) => row.slug === post.slug) ?? null;
}

/**
 * 묶음의 공개 항목 slug. 빌드할 때 글 주소 페이지와 본문 경로를 미리 만드는 데 쓴다. 이 밖의 slug는 404다.
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param collection 묶음
 * @returns slug
 */
export async function getContentSlugs(collection: PostCollection): Promise<string[]> {
  return (await readContentRows(collection)).map((row) => row.slug);
}

/**
 * 공개 항목 하나의 본문. 목록에서 slug로 페이지를 찾고, 본문은 페이지마다 한 번만 만든다.
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param post 항목(묶음과 slug)
 * @returns 본문. 공개 항목이 아니면 null
 */
export async function getContentBody(post: PostRef): Promise<PostBody | null> {
  const row = await getContentRow(post);
  return row === null ? null : getPageBody({ pageId: row.pageId, cover: row.cover });
}

/**
 * 페이지 본문을 한 번만 만들어 돌려준다.
 * @param page 공개 행의 페이지 ID와 커버
 * @returns 본문
 */
function getPageBody(page: PageSource): Promise<PostBody> {
  let body = pageBodies.get(page.pageId);
  if (body === undefined) {
    body = readPageBody(page);
    pageBodies.set(page.pageId, body);
  }
  return body;
}
