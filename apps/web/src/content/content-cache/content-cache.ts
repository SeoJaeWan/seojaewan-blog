import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';

import { type PostRow, toPostSummary } from '@/content/post-schema/post-schema';
import { type PageSource, readContentRows, readPageBody } from '@/content/post-source/post-source';
import {
  POST_COLLECTIONS,
  type PostCollection,
  type PostRef,
} from '@/shared/utils/post-address/post-address';
import type { PostBody } from '@/shared/utils/post-body/post-body';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 목록(세 묶음의 공개 행)의 캐시 태그. 웹훅이 오면 바뀐 페이지와 함께 늘 갱신한다. 웹훅은 바뀐 페이지가 어느 묶음인지 알려 주지 않고,
 * 공개를 켜고 끄거나 slug를 바꿔도 목록이 바뀌기 때문이다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 */
export const CONTENT_INDEX_TAG = 'notion-index';

// 페이지 본문 캐시 태그의 머리다.
const PAGE_TAG_PREFIX = 'notion-page:';

// 캐시 수명 이름. `next.config.ts`의 `cacheLife`에 시간으로 다시 만들지 않는 수명으로 정해 두었다.
const CONTENT_CACHE_LIFE = 'content';

/**
 * Notion 페이지 본문의 캐시 태그. 페이지 ID는 하이픈을 빼고 소문자로 맞춘다. 웹훅과 데이터베이스 조회가 같은 ID를 다르게 쓸 수 있어서다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @param pageId Notion 페이지 ID
 * @returns 캐시 태그
 */
export function getPageCacheTag(pageId: string): string {
  return `${PAGE_TAG_PREFIX}${pageId.replaceAll('-', '').toLowerCase()}`;
}

/**
 * 세 묶음의 공개 항목 색인. 작업 공간(바탕화면 폴더, 탐색기, 검색, Chrome)이 쓴다.
 * 묶음마다 목록 태그(`CONTENT_INDEX_TAG`)로 캐시한다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @returns 색인(묶음 차례, 묶음 안은 최신순)
 */
export async function getContentIndex(): Promise<PostSummary[]> {
  const rowsByCollection = await Promise.all(POST_COLLECTIONS.map(getRows));
  return POST_COLLECTIONS.flatMap((collection, index) =>
    (rowsByCollection[index] ?? []).map((row) => toPostSummary(row, collection)),
  );
}

/**
 * 묶음의 공개 항목 slug. 빌드할 때 글 주소 페이지를 미리 만드는 데 쓴다.
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param collection 묶음
 * @returns slug
 */
export async function getContentSlugs(collection: PostCollection): Promise<string[]> {
  return (await getRows(collection)).map((row) => row.slug);
}

/**
 * 공개 항목 하나의 본문. 목록에서 slug로 페이지를 찾고, 본문은 페이지마다 페이지 태그로 캐시한다.
 * 그래서 웹훅이 오면 목록과 바뀐 페이지만 다시 읽고, 다른 페이지의 본문은 Notion을 다시 부르지 않는다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param post 항목(묶음과 slug)
 * @returns 본문. 공개 항목이 아니면 null
 */
export async function getContentBody(post: PostRef): Promise<PostBody | null> {
  const row = (await getRows(post.collection)).find((candidate) => candidate.slug === post.slug);
  return row === undefined ? null : getPageBody({ pageId: row.pageId, cover: row.cover });
}

/**
 * 묶음의 공개 행을 목록 태그로 캐시해 읽는다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @param collection 묶음
 * @returns 공개 행(최신순)
 */
async function readCachedRows(collection: PostCollection): Promise<PostRow[]> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(CONTENT_INDEX_TAG);
  return readContentRows(collection);
}

/**
 * 페이지 본문을 페이지 태그로 캐시해 읽는다. 커버도 본문에 들어가므로 캐시 열쇠에 함께 넣는다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @param page 공개 행의 페이지 ID와 커버
 * @returns 본문
 */
async function getPageBody(page: PageSource): Promise<PostBody> {
  'use cache';
  cacheLife(CONTENT_CACHE_LIFE);
  cacheTag(getPageCacheTag(page.pageId));
  return readPageBody(page);
}

/**
 * 묶음의 공개 행. 한 번 그리는 동안 같은 묶음은 한 번만 읽는다(React `cache`). 색인과 본문을 함께 읽어도 데이터베이스를 두 번 조회하지 않는다.
 */
const getRows = cache(readCachedRows);
