import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getPostBody, getPostIndex } from '@/content/post-source/post-source';
import { Shell } from '@/shell/shell';

type PostEntryPageProps = {
  params: Promise<PostRouteParams>;
};

/** 경로 값 */
type PostRouteParams = {
  slug: string;
};

/**
 * 빌드할 때 공개 글마다 글 주소 페이지의 HTML을 만들어 둔다. 목록에 없던 slug는 처음 들어올 때 서버가 그린다
 * (공개하지 않은 글이면 404다).
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @returns 공개 글의 slug
 */
export async function generateStaticParams(): Promise<PostRouteParams[]> {
  return (await getPostIndex()).map(({ slug }) => ({ slug }));
}

/**
 * 글 주소(`/posts/<slug>`)로 처음 들어온 화면이다. 서버에서 글 색인과 그 글의 본문을 읽어 shell에 넘긴다. shell은 그 글 탭이 열린
 * Chrome 창 하나를 서버에서 그려, 첫 HTML에 창과 글 제목·본문 글자가 들어 있다. 공개 글이 아니면 404로 답한다
 * (`not-found.tsx`가 찾을 수 없음 Chrome 창을 그린다).
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @codocs [[Chrome:글 주소]]
 * @param props 컴포넌트 속성
 * @param props.params 경로의 글 slug
 * @returns 글이 열린 화면
 */
export default async function PostEntryPage({ params }: PostEntryPageProps): Promise<ReactNode> {
  const { slug } = await params;
  const [posts, body] = await Promise.all([getPostIndex(), getPostBody(slug)]);
  if (body === null) {
    notFound();
  }
  return <Shell posts={posts} initialPage={{ kind: 'post', slug, body }} />;
}
