import { getChromeWindowTitle } from '@/features/chrome/utils/chrome-tab-title/chrome-tab-title';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type { ChromeWindowContent } from '@/shared/utils/chrome-tabs/chrome-tabs';

/**
 * Chrome 창 제목을 정하는 함수를 돌려준다. 제목은 고른 탭의 글 제목이라 글 색인을 담은 작업 공간을 읽는다.
 * @codocs [[Chrome:구성]]
 * @returns Chrome 창 내용을 받아 창 제목을 돌려주는 함수
 */
export function useChromeWindowTitle(): (content: ChromeWindowContent) => string {
  const items = useWorkspaceStore((state) => state.items);
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
