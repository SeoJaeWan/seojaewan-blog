import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getPostIndex } from '@/content/post-source/post-source';
import { Shell } from '@/shell/shell';

type PostEntryPageProps = {
  /** 경로의 글 slug */
  params: Promise<PostRouteParams>;
};

/** 경로 값 */
type PostRouteParams = {
  /** 글 slug */
  slug: string;
};

/**
 * 글 주소(`/posts/<slug>`)로 처음 들어온 화면이다. 서버에서 글 색인을 읽어 shell에 넘기고, 그 글 탭이 열린 Chrome 창 하나로
 * 시작하게 한다. 색인에 없는 글이면 404로 답한다(`not-found.tsx`가 찾을 수 없음 Chrome 창을 그린다).
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @codocs [[Chrome:글 주소]]
 * @param props
 * @returns 글이 열린 화면
 */
export default async function PostEntryPage(props: PostEntryPageProps): Promise<ReactNode> {
  const { slug } = await props.params;
  const posts = await getPostIndex();
  if (!posts.some((post) => post.slug === slug)) {
    notFound();
  }
  return <Shell posts={posts} initialPage={{ kind: 'post', slug }} />;
}
