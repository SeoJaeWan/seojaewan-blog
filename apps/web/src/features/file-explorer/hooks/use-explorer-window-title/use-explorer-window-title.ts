import { getExplorerWindowTitle } from '@/features/file-explorer/utils/explorer-location/explorer-location';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';

/**
 * 탐색기 창 제목을 정하는 함수를 돌려준다. 제목은 보고 있는 위치 이름이라, 폴더 이름이 바뀌면 다시 그리도록 작업 공간을 읽는다.
 * @codocs [[파일 탐색기:탭]]
 * @returns 보고 있는 위치를 받아 창 제목을 돌려주는 함수
 */
export function useExplorerWindowTitle(): (folderId: string | null) => string {
  const items = useWorkspaceStore((state) => state.items);
  /**
   * 탐색기 창 제목을 정한다.
   * @param folderId 보고 있는 위치
   * @returns 창 제목
   */
  function getTitle(folderId: string | null): string {
    return getExplorerWindowTitle({ items }, folderId);
  }
  return getTitle;
}
