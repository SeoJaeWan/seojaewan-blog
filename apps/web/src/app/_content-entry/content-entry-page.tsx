import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  getContentBody,
  getContentIndex,
  getContentSlugs,
} from '@/content/content-cache/content-cache';
import type { PostCollection } from '@/shared/utils/post-address/post-address';
import { Shell } from '@/shell/shell';

/** 글 주소의 경로 값 */
export type ContentEntryParams = {
  slug: string;
};

// 공개 항목이 하나도 없는 묶음에서 빌드할 때 넘기는 slug다. Cache Components는 경로 값이 하나 이상이어야 빌드되기 때문이다.
// slug 규칙(영어 소문자·숫자·하이픈)에 맞지 않아 실제 항목과 겹치지 않고, 그 주소는 404다.
const EMPTY_COLLECTION_SLUG = '_none';

/**
 * 빌드할 때 묶음의 공개 항목마다 글 주소 페이지의 HTML을 만들어 둘 경로 값. 목록에 없던 slug는 처음 들어올 때 서버가 그린다
 * (공개하지 않은 항목이면 404다).
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @param collection 묶음
 * @returns 공개 항목의 slug. 공개 항목이 없으면 404가 되는 slug 하나
 */
export async function getContentEntryParams(
  collection: PostCollection,
): Promise<ContentEntryParams[]> {
  const slugs = await getContentSlugs(collection);
  return (slugs.length === 0 ? [EMPTY_COLLECTION_SLUG] : slugs).map((slug) => ({ slug }));
}

/**
 * 글 주소(`/posts/<slug>`, `/projects/<slug>`, `/about/<slug>`)로 처음 들어온 화면이다. 세 묶음이 같은 동작이다.
 * 서버에서 색인과 그 항목의 본문을 읽어 shell에 넘긴다. shell은 그 항목 탭이 열린 Chrome 창 하나를 서버에서 그려, 첫 HTML에 창과
 * 제목·본문 글자가 들어 있다. 공개 항목이 아니면 404로 답한다(`not-found.tsx`가 찾을 수 없음 Chrome 창을 그린다).
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @codocs [[Chrome:글 주소]]
 * @param collection 묶음
 * @param params 경로 값
 * @returns 항목이 열린 화면
 */
export async function renderContentEntry(
  collection: PostCollection,
  params: Promise<ContentEntryParams>,
): Promise<ReactNode> {
  const { slug } = await params;
  const [posts, body] = await Promise.all([
    getContentIndex(),
    getContentBody({ collection, slug }),
  ]);
  if (body === null) {
    notFound();
  }
  return <Shell posts={posts} initialPage={{ kind: 'post', collection, slug, body }} />;
}
