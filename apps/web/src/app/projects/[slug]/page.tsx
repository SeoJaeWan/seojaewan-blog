import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import {
  type ContentEntryParams,
  getContentEntryMetadata,
  getContentEntryParams,
  renderContentEntry,
} from '@/app/_content-entry/content-entry-page';

type ProjectEntryPageProps = {
  params: Promise<ContentEntryParams>;
};

/**
 * `/projects/<slug>` 페이지의 메타 정보(제목, 설명, canonical, 공유 그림).
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @param props 페이지 속성
 * @param props.params 경로의 slug
 * @returns 메타 정보
 */
export async function generateMetadata({ params }: ProjectEntryPageProps): Promise<Metadata> {
  return getContentEntryMetadata('project', params);
}

/**
 * 빌드할 때 공개 Project 항목마다 `/projects/<slug>` 페이지의 HTML을 만들어 둔다.
 * @codocs [[SEO와 공유 미리보기:첫 HTML]]
 * @returns 공개 Project 항목의 slug
 */
export async function generateStaticParams(): Promise<ContentEntryParams[]> {
  return getContentEntryParams('project');
}

/**
 * Project 항목 주소(`/projects/<slug>`)로 처음 들어온 화면이다. 그 항목이 열린 Chrome 창 하나로 시작한다.
 * @codocs [[Chrome:글 주소]]
 * @param props 컴포넌트 속성
 * @param props.params 경로의 slug
 * @returns Project 항목이 열린 화면
 */
export default async function ProjectEntryPage({
  params,
}: ProjectEntryPageProps): Promise<ReactNode> {
  return renderContentEntry('project', params);
}
