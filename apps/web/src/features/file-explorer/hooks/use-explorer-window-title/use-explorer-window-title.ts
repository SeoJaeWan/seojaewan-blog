import { getExplorerWindowTitle } from '@/features/file-explorer/utils/explorer-location/explorer-location';
import { getCurrentLocation } from '@/features/file-explorer/utils/explorer-navigation/explorer-navigation';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type { ExplorerWindowContent } from '@/shared/utils/window-rules/window-rules';

/**
 * 탐색기 창 제목을 정하는 함수를 돌려준다. 제목은 고른 탭이 보고 있는 위치 이름이라, 폴더 이름이 바뀌면 다시 그리도록 작업 공간을 읽는다.
 * @codocs [[파일 탐색기:탭]]
 * @returns 탐색기 창 내용을 받아 창 제목을 돌려주는 함수
 */
export function useExplorerWindowTitle(): (content: ExplorerWindowContent) => string {
  const items = useWorkspaceStore((state) => state.items);
  /**
   * 탐색기 창 제목을 정한다.
   * @param content 탐색기 창 내용
   * @returns 창 제목
   */
  function getTitle(content: ExplorerWindowContent): string {
    return getExplorerWindowTitle({ items }, getCurrentLocation(content));
  }
  return getTitle;
}
