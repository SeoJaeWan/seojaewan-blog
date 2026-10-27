import type { ReactNode } from 'react';

import { getPostIndex } from '@/content/post-source/post-source';
import { Shell } from '@/shell/shell';

/**
 * 홈 화면이다. 서버에서 글 색인을 읽어 앱 화면 전체(shell)에 넘긴다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @returns 홈 화면
 */
export default async function HomePage(): Promise<ReactNode> {
  const posts = await getPostIndex();
  return <Shell posts={posts} />;
}
