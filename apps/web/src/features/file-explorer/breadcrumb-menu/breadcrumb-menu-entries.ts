import {
  type ExplorerLocationIcon,
  type ExplorerWorkspace,
  getExplorerLocationIcon,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import { sortExplorerItems } from '@/features/file-explorer/utils/explorer-sort/explorer-sort';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';
import {
  type ExplorerFolderView,
  type FolderItem,
  getChildItems,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 경로 꺾쇠 목록의 한 줄. location은 고르면 갈 위치, name은 글자, icon은 위치 아이콘 자산이다 */
export type BreadcrumbMenuTarget = {
  location: ExplorerLocation;
  name: string;
  icon: ExplorerLocationIcon;
};

// @codocs [[파일 탐색기:구성]]
// 피그마 Explorer/BreadcrumbMenu에서 목록은 꺾쇠 바로 아래가 아니라 이만큼 더 아래, 꺾쇠 왼쪽 끝보다 이만큼 더 왼쪽에 그려진다.
// 패리티 캡처의 피그마 그림과 코드 그림에서 목록 테두리 위치를 재어 맞춘 값이다(px).
export const BREADCRUMB_MENU_SIDE_OFFSET = 6;
export const BREADCRUMB_MENU_ALIGN_OFFSET = -11;

/**
 * 경로 꺾쇠 목록(피그마 Explorer/BreadcrumbMenu의 MenuPopup) 항목을 만든다. 실제 탐색기와 조립 스토리가 함께 쓴다.
 * 줄마다 위치 아이콘과 이름을 보이고, 고르면 그 위치로 간다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[디자인 시스템:조립]]
 * @param targets 목록에 보일 위치(위에서부터)
 * @param onNavigate 고른 위치로 같은 탭에서 간다
 * @returns 메뉴 항목
 */
export function getBreadcrumbMenuEntries(
  targets: readonly BreadcrumbMenuTarget[],
  onNavigate: (location: ExplorerLocation) => void,
): MenuPopupEntry[] {
  return targets.map(
    /**
     * 위치 하나를 목록 줄로 바꾼다.
     * @param target 위치
     * @returns 목록 줄
     */
    (target) => ({
      label: target.name,
      icon: target.icon,
      onClick: () => {
        onNavigate(target.location);
      },
    }),
  );
}

/**
 * 경로 마디 뒤 꺾쇠가 보일 하위 폴더. 그 위치(폴더, 바탕화면)에 바로 든 폴더를 그 위치에 기억한 정렬로 늘어놓는다.
 * 휴지통 안의 폴더는 열 수 없어 휴지통은 하위 폴더가 없다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param workspace 작업 공간
 * @param location 마디의 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 * @param view 그 위치에 기억한 보기와 정렬
 * @returns 하위 폴더
 */
export function getSubfolderTargets(
  workspace: ExplorerWorkspace,
  location: ExplorerLocation,
  view: Pick<ExplorerFolderView, 'sortBy' | 'sortDirection'>,
): BreadcrumbMenuTarget[] {
  if (location === RECYCLE_BIN_ID) {
    return [];
  }
  const folders = getChildItems(workspace, location).filter(
    (item): item is FolderItem => item.kind === 'folder',
  );
  return sortExplorerItems(folders, view, workspace).map(
    /**
     * 하위 폴더 하나를 목록 줄 위치로 바꾼다.
     * @param folder 하위 폴더
     * @returns 목록 줄 위치
     */
    (folder) => ({
      location: folder.id,
      name: folder.name,
      icon: getExplorerLocationIcon(workspace, folder.id),
    }),
  );
}
