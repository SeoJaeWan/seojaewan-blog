import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import {
  type ContentEntryParams,
  getContentEntryMetadata,
  getContentEntryParams,
  renderContentEntry,
} from '@/app/_content-entry/content-entry-page';

type PostEntryPageProps = {
  params: Promise<ContentEntryParams>;
};

/**
 * `/posts/<slug>` 페이지의 메타 정보(제목, 설명, canonical, 공유 그림).
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @param props 페이지 속성
 * @param props.params 경로의 slug
 * @returns 메타 정보
 */
export async function generateMetadata({ params }: PostEntryPageProps): Promise<Metadata> {
  return getContentEntryMetadata('blog', params);
}

// @codocs [[콘텐츠 원천:결정]]
// 완전한 정적 생성이다. 빌드 때 만든 slug만 내주고, 모르는 slug는 서버가 그리지 않고 미리 만든 404 페이지로 답한다.
export const dynamicParams = false;

/**
 * 빌드할 때 공개 글마다 `/posts/<slug>` 페이지의 HTML을 만들어 둔다.
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @returns 공개 글의 slug
 */
export async function generateStaticParams(): Promise<ContentEntryParams[]> {
  return getContentEntryParams('blog');
}

/**
 * 글 주소(`/posts/<slug>`)로 처음 들어온 화면이다. 그 항목이 열린 Chrome 창 하나로 시작한다.
 * @codocs [[Chrome:글 주소]]
 * @param props 컴포넌트 속성
 * @param props.params 경로의 slug
 * @returns 글이 열린 화면
 */
export default async function PostEntryPage({ params }: PostEntryPageProps): Promise<ReactNode> {
  return renderContentEntry('blog', params);
}
