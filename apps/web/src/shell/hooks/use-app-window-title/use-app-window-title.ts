import { useChromeWindowTitle } from '@/features/chrome/use-chrome-window-title';
import { useExplorerWindowTitle } from '@/features/file-explorer/use-explorer-window-title';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 창 제목을 정하는 함수를 돌려준다. 앱에 맞는 기능(탐색기, Chrome)의 제목 함수를 고르기만 한다(앱 등록표).
 * 창 층(창 영역의 접근성 이름)과 작업 표시줄 창 미리보기가 쓴다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @param serverPosts 서버가 읽은 글 색인. 저장분을 읽기 전에도 Chrome 창 제목에 글 제목을 쓴다
 * @returns 열린 창을 받아 창 제목을 돌려주는 함수
 */
export function useAppWindowTitle(
  serverPosts?: readonly PostSummary[],
): (window: OpenWindow) => string {
  const getExplorerTitle = useExplorerWindowTitle();
  const getChromeTitle = useChromeWindowTitle(serverPosts);
  /**
   * 창 제목을 정한다.
   * @param target 열린 창
   * @returns 창 제목
   */
  function getWindowTitle(target: OpenWindow): string {
    const { content } = target;
    return content.app === 'chrome' ? getChromeTitle(content) : getExplorerTitle(content);
  }
  return getWindowTitle;
}
