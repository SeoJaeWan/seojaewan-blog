import { useChromeWindowTitle } from '@/features/chrome/chrome';
import { useExplorerWindowTitle } from '@/features/file-explorer/file-explorer';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';

/**
 * 창 제목을 정하는 함수를 돌려준다. 앱에 맞는 기능(탐색기, Chrome)의 제목 함수를 고르기만 한다(앱 등록표).
 * 창 층(창 영역의 접근성 이름)과 작업 표시줄 창 미리보기가 쓴다.
 * @codocs [[저장소 구성:앱 폴더 구조]]
 * @returns 열린 창을 받아 창 제목을 돌려주는 함수
 */
export function useAppWindowTitle(): (window: OpenWindow) => string {
  const getExplorerTitle = useExplorerWindowTitle();
  const getChromeTitle = useChromeWindowTitle();
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
