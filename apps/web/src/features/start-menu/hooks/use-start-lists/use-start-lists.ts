import type { PinnedMovePlayer } from '@/features/start-menu/components/start-body/start-body';
import { getListMenuEntries } from '@/features/start-menu/list-menu/list-menu-entries';
import {
  getPinnedMenuEntries,
  getPinnedMoves,
} from '@/features/start-menu/pinned-menu/pinned-menu-entries';
import type {
  StartAllView,
  StartItem,
  StartItemGroup,
} from '@/features/start-menu/utils/start-items/start-items';
import {
  getAllStartItems,
  getPinnedStartItems,
  groupStartItems,
} from '@/features/start-menu/utils/start-items/start-items';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { copyItemLink } from '@/shared/utils/item-link/item-link';

/**
 * Start 고정됨과 모두 목록을 그리는 데이터와 그 동작
 * - view: 모두 목록의 보기
 * - pinned: 고정됨 항목. 고정한 순서이고 휴지통에 들어간 항목은 뺀다
 * - groups: 모두 목록의 묶음
 * - getPinnedMenuItems: 고정 항목의 우클릭 메뉴 항목. 이동 메뉴는 받은 `playMove`로 움직임과 함께 옮긴다
 * - getListMenuItems: 모두 목록 항목의 우클릭 메뉴 항목
 * - movePinned: 고정 항목을 다른 고정 항목의 자리로 옮긴다
 * - changeView: 모두 목록의 보기를 바꾼다
 */
export type StartLists = {
  view: StartAllView;
  pinned: readonly StartItem[];
  groups: readonly StartItemGroup[];
  getPinnedMenuItems: (item: StartItem, playMove: PinnedMovePlayer) => readonly MenuPopupEntry[];
  getListMenuItems: (item: StartItem) => readonly MenuPopupEntry[];
  movePinned: (id: string, targetId: string) => void;
  changeView: (view: StartAllView) => void;
};

/**
 * Start 고정됨과 모두 목록을 작업 공간 저장소에서 읽어 그릴 모양으로 돌려주고, 고정 순서·고정 해제·보기 전환을 저장소에 반영하는 동작을 준다.
 * 보기는 저장소에 저장하고, 다시 시작하면 처음 상태(범주)로 돌아간다.
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[방문자 저장:저장하는 것]]
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
   * 고정 항목의 우클릭 메뉴 항목을 만든다. 이동 메뉴(앞으로·왼쪽으로·오른쪽으로 이동)는 `playMove`에 순서 바꾸기를 넘겨,
   * 옮기는 칸이 사라진 뒤 그때의 저장소 상태로 옮긴다.
   * @param item 고정 항목
   * @param playMove 움직임과 함께 순서를 바꾸는 함수
   * @returns 메뉴 항목
   */
  function getPinnedMenuItems(
    item: StartItem,
    playMove: PinnedMovePlayer,
  ): readonly MenuPopupEntry[] {
    const copyableItem = getCopyableItem(item);
    // 이동 메뉴는 화면에 보이는 위치로 정한다.
    const moves = getPinnedMoves(
      pinned.findIndex((pinnedItem) => pinnedItem.id === item.id),
      pinned.length,
    );
    return getPinnedMenuEntries({
      moves,
      canCopyLink: copyableItem !== undefined,
      onOpen: () => {
        onOpen(item);
      },
      onMoveToFront: () => {
        playMove(() => {
          useWorkspaceStore.getState().moveStartPin(item.id, 0);
        });
      },
      onMoveLeft: () => {
        playMove(() => {
          useWorkspaceStore.getState().swapStartPin(item.id, 'left');
        });
      },
      onMoveRight: () => {
        playMove(() => {
          useWorkspaceStore.getState().swapStartPin(item.id, 'right');
        });
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
