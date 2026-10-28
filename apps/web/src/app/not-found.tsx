import type { ReactNode } from 'react';

import { getPostIndex } from '@/content/post-source/post-source';
import { Shell } from '@/shell/shell';

/**
 * 주소에 해당하는 페이지가 없을 때(없는 글 주소 등) 404로 답하는 화면이다. 바탕화면 위에 `페이지를 찾을 수 없음` 화면이 열린
 * Chrome 창 하나로 시작한다.
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @returns 찾을 수 없음 Chrome 창이 열린 화면
 */
export default async function NotFoundPage(): Promise<ReactNode> {
  const posts = await getPostIndex();
  return <Shell posts={posts} initialPage={{ kind: 'not-found' }} />;
}
