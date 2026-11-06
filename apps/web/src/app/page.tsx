import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getContentIndex } from '@/content/content-cache/content-cache';
import { getHomeMetadata } from '@/content/site-metadata/site-metadata';
import { Shell } from '@/shell/shell';

// @codocs [[SEO와 공유 미리보기:메타 정보]]
export const metadata: Metadata = getHomeMetadata();

/**
 * 홈 화면이다. 서버에서 세 묶음의 색인을 읽어 앱 화면 전체(shell)에 넘긴다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @returns 홈 화면
 */
export default async function HomePage(): Promise<ReactNode> {
  const posts = await getContentIndex();
  return <Shell posts={posts} />;
}
