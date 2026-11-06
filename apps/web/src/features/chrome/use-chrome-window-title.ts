import { useWorkspaceItems } from '@/shared/stores/workspace-store/workspace-store';
import type { ChromeWindowContent } from '@/shared/utils/chrome-tabs/chrome-tabs';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

import { getChromeWindowTitle } from './utils/chrome-tab-title/chrome-tab-title';

/**
 * Chrome 창 제목을 정하는 함수를 돌려준다. 제목은 고른 탭의 글 제목이라 글 색인을 담은 작업 공간을 읽는다.
 * 서버가 읽은 글 색인을 받으면 저장분을 읽기 전(서버가 그리는 첫 진입 창)에도 글 제목을 쓴다.
 * @codocs [[Chrome:구성]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param serverPosts 서버가 읽은 글 색인. 없으면 저장소만 읽는다
 * @returns Chrome 창 내용을 받아 창 제목을 돌려주는 함수
 */
export function useChromeWindowTitle(
  serverPosts?: readonly PostSummary[],
): (content: ChromeWindowContent) => string {
  const items = useWorkspaceItems(serverPosts);
  /**
   * Chrome 창 제목을 정한다.
   * @param content Chrome 창 내용
   * @returns 창 제목
   */
  function getTitle(content: ChromeWindowContent): string {
    return getChromeWindowTitle({ items }, content);
  }
  return getTitle;
}
