import type {
  StartAllView,
  StartItem,
  StartItemGroup,
} from '@/features/start-menu/components/start-body/start-body';
import {
  getAllStartItems,
  getPinnedStartItems,
  groupStartItems,
} from '@/features/start-menu/utils/start-items/start-items';
import {
  getListMenuEntries,
  getPinnedMenuEntries,
} from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { copyItemLink } from '@/shared/utils/item-link/item-link';

/** Start 고정됨과 모두 목록을 그리는 데이터와 그 동작 */
export type StartLists = {
  /** 모두 목록의 보기 */
  view: StartAllView;
  /** 고정됨 항목. 고정한 순서이고 휴지통에 들어간 항목은 뺀다 */
  pinned: readonly StartItem[];
  /** 모두 목록의 묶음 */
  groups: readonly StartItemGroup[];
  /** 고정 항목의 우클릭 메뉴 항목 */
  getPinnedMenuItems: (item: StartItem) => readonly MenuPopupEntry[];
  /** 모두 목록 항목의 우클릭 메뉴 항목 */
  getListMenuItems: (item: StartItem) => readonly MenuPopupEntry[];
  /** 고정 항목을 다른 고정 항목의 자리로 옮긴다 */
  movePinned: (id: string, targetId: string) => void;
  /** 모두 목록의 보기를 바꾼다 */
  changeView: (view: StartAllView) => void;
};

/**
 * Start 고정됨과 모두 목록을 작업 공간 저장소에서 읽어 그릴 모양으로 돌려주고, 고정 순서·고정 해제·보기 전환을 저장소에 반영하는 동작을 준다.
 * 보기는 저장소에 저장하고, 다시 시작하면 처음 상태(범주)로 돌아간다.
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[작업 공간:방문자별 저장]]
 * @param onOpen 메뉴의 `열기`를 골랐을 때 항목을 여는 함수
 * @returns 목록 데이터와 동작
 */
export function useStartLists(onOpen: (item: StartItem) => void): StartLists {
  const workspace = useWorkspaceStore((state) => state);
  const pinned = getPinnedStartItems(workspace);
  const view = workspace.startAllView;

  /**
   * 링크를 복사할 수 있는 항목(글과 외부 링크)이면 작업 공간 항목을 돌려준다.
   * @param item Start 항목
   * @returns 링크를 복사할 작업 공간 항목. 복사할 수 없으면 undefined
   */
  function getCopyableItem(item: StartItem) {
    const workspaceItem = workspace.items[item.id];
    return workspaceItem?.kind === 'post' || workspaceItem?.kind === 'link'
      ? workspaceItem
      : undefined;
  }

  /**
   * 고정 항목의 우클릭 메뉴 항목을 만든다.
   * @param item 고정 항목
   * @returns 메뉴 항목
   */
  function getPinnedMenuItems(item: StartItem): readonly MenuPopupEntry[] {
    const copyableItem = getCopyableItem(item);
    return getPinnedMenuEntries({
      canMoveToFront: pinned[0]?.id !== item.id,
      canCopyLink: copyableItem !== undefined,
      onOpen: () => {
        onOpen(item);
      },
      onMoveToFront: () => {
        workspace.moveStartPin(item.id, 0);
      },
      onCopyLink: () => {
        if (copyableItem !== undefined) {
          copyItemLink(copyableItem);
        }
      },
      onUnpin: () => {
        workspace.unpinFromStart(item.id);
      },
    });
  }

  /**
   * 모두 목록 항목의 우클릭 메뉴 항목을 만든다.
   * @param item 모두 목록 항목
   * @returns 메뉴 항목
   */
  function getListMenuItems(item: StartItem): readonly MenuPopupEntry[] {
    const copyableItem = getCopyableItem(item);
    const isPinnedToStart = workspace.startPins.includes(item.id);
    const app = item.kind === 'app' ? item.app : undefined;
    const isPinnedToTaskbar = app === undefined ? undefined : workspace.taskbarPins.includes(app);
    return getListMenuEntries({
      isPinnedToStart,
      canCopyLink: copyableItem !== undefined,
      isPinnedToTaskbar,
      onOpen: () => {
        onOpen(item);
      },
      onToggleStartPin: () => {
        if (isPinnedToStart) {
          workspace.unpinFromStart(item.id);
        } else {
          workspace.pinToStart(item.id);
        }
      },
      onCopyLink: () => {
        if (copyableItem !== undefined) {
          copyItemLink(copyableItem);
        }
      },
      onToggleTaskbarPin: () => {
        if (app === undefined) {
          return;
        }
        if (isPinnedToTaskbar === true) {
          workspace.unpinFromTaskbar(app);
        } else {
          workspace.pinToTaskbar(app);
        }
      },
    });
  }

  /**
   * 고정 항목을 다른 고정 항목의 자리로 옮긴다. 끄는 동안 여러 번 불리므로 그때그때의 저장소 상태로 자리를 찾는다.
   * @param id 옮길 항목 id
   * @param targetId 놓인 칸의 항목 id
   */
  function movePinned(id: string, targetId: string): void {
    const state = useWorkspaceStore.getState();
    const index = state.startPins.indexOf(targetId);
    if (index !== -1) {
      state.moveStartPin(id, index);
    }
  }

  return {
    view,
    pinned,
    groups: groupStartItems(getAllStartItems(workspace), view),
    getPinnedMenuItems,
    getListMenuItems,
    movePinned,
    changeView: workspace.setStartAllView,
  };
}
