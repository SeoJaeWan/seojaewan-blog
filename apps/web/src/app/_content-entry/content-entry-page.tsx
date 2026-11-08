import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  getContentBody,
  getContentIndex,
  getContentRow,
  getContentSlugs,
} from '@/content/content-store/content-store';
import { getEntryMetadata } from '@/content/site-metadata/site-metadata';
import type { PostCollection } from '@/shared/utils/post-address/post-address';
import { Shell } from '@/shell/shell';

/** 글 주소의 경로 값 */
export type ContentEntryParams = {
  slug: string;
};

/**
 * 빌드할 때 묶음의 공개 항목마다 글 주소 페이지(와 본문 경로)를 만들어 둘 경로 값. 사이트는 완전한 정적 생성이라 이 밖의 slug는
 * 서버가 그리지 않고 미리 만든 404 페이지로 답한다(각 페이지의 `dynamicParams = false`).
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @codocs [[콘텐츠 원천:결정]]
 * @param collection 묶음
 * @returns 공개 항목의 slug
 */
export async function getContentEntryParams(
  collection: PostCollection,
): Promise<ContentEntryParams[]> {
  return (await getContentSlugs(collection)).map((slug) => ({ slug }));
}

/**
 * 글 주소 페이지의 메타 정보(제목, 설명, canonical, 공유 그림). 공개 항목이 아니면
 * 루트 레이아웃 것을 그대로 쓴다(화면이 404로 답한다).
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @param collection 묶음
 * @param params 경로 값
 * @returns 메타 정보
 */
export async function getContentEntryMetadata(
  collection: PostCollection,
  params: Promise<ContentEntryParams>,
): Promise<Metadata> {
  const { slug } = await params;
  const post = { collection, slug };
  const row = await getContentRow(post);
  if (row === null) {
    return {};
  }
  return getEntryMetadata({ post, row });
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
