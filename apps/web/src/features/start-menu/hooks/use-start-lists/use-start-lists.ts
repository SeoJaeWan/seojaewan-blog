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
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { copyItemLink } from '@/shared/utils/item-link/item-link';

// 고정 항목 우클릭 메뉴(피그마 `Menu/StartTile`)와 모두 목록 메뉴(피그마 `Menu/StartListApp`·`Menu/StartListPost`)의 아이콘이다.
const MENU_ICONS = {
  open: 'icons/ic_fluent_open_20_regular.svg',
  pin: 'icons/ic_fluent_pin_20_regular.svg',
  moveToFront: 'icons/ic_fluent_arrow_up_20_regular.svg',
  copyLink: 'icons/ic_fluent_link_20_regular.svg',
  unpin: 'icons/ic_fluent_pin_off_20_regular.svg',
} as const;

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
   * 고정 항목의 우클릭 메뉴 항목을 만든다. 열기, 맨 앞으로 이동(이미 맨 앞이면 고를 수 없다), 링크 복사(글과 외부 링크만), 고정 해제다.
   * @param item 고정 항목
   * @returns 메뉴 항목
   */
  function getPinnedMenuItems(item: StartItem): readonly MenuPopupEntry[] {
    const workspaceItem = workspace.items[item.id];
    const copyableItem =
      workspaceItem?.kind === 'post' || workspaceItem?.kind === 'link' ? workspaceItem : undefined;
    const entries: MenuPopupEntry[] = [
      {
        label: '열기',
        icon: MENU_ICONS.open,
        onClick: () => {
          onOpen(item);
        },
      },
      {
        label: '맨 앞으로 이동',
        icon: MENU_ICONS.moveToFront,
        disabled: pinned[0]?.id === item.id,
        onClick: () => {
          workspace.moveStartPin(item.id, 0);
        },
      },
    ];
    if (copyableItem !== undefined) {
      entries.push({
        label: '링크 복사',
        icon: MENU_ICONS.copyLink,
        onClick: () => {
          copyItemLink(copyableItem);
        },
      });
    }
    entries.push(
      { kind: 'separator' },
      {
        label: '시작 화면에서 고정 해제',
        icon: MENU_ICONS.unpin,
        onClick: () => {
          workspace.unpinFromStart(item.id);
        },
      },
    );
    return entries;
  }

  /**
   * 모두 목록 항목의 우클릭 메뉴 항목을 만든다. 열기, 시작 화면에 고정(이미 고정됐으면 고정 해제), 링크 복사(글과 외부 링크만),
   * 작업 표시줄에 고정(앱만, 이미 고정됐으면 고정 해제)이다.
   * @codocs [[Start 메뉴:모두]]
   * @param item 모두 목록 항목
   * @returns 메뉴 항목
   */
  function getListMenuItems(item: StartItem): readonly MenuPopupEntry[] {
    const workspaceItem = workspace.items[item.id];
    const copyableItem =
      workspaceItem?.kind === 'post' || workspaceItem?.kind === 'link' ? workspaceItem : undefined;
    const isPinnedToStart = workspace.startPins.includes(item.id);
    const entries: MenuPopupEntry[] = [
      {
        label: '열기',
        icon: MENU_ICONS.open,
        onClick: () => {
          onOpen(item);
        },
      },
      { kind: 'separator' },
      isPinnedToStart
        ? {
            label: '시작 화면에서 고정 해제',
            icon: MENU_ICONS.unpin,
            onClick: () => {
              workspace.unpinFromStart(item.id);
            },
          }
        : {
            label: '시작 화면에 고정',
            icon: MENU_ICONS.pin,
            onClick: () => {
              workspace.pinToStart(item.id);
            },
          },
    ];
    if (copyableItem !== undefined) {
      entries.push({
        label: '링크 복사',
        icon: MENU_ICONS.copyLink,
        onClick: () => {
          copyItemLink(copyableItem);
        },
      });
    }
    if (item.kind === 'app') {
      const { app } = item;
      entries.push(
        workspace.taskbarPins.includes(app)
          ? {
              label: '작업 표시줄에서 고정 해제',
              // 작업 표시줄 앱 메뉴(피그마 `Menu/TaskbarApp`)의 고정 해제와 같은 아이콘이다
              icon: MENU_ICONS.pin,
              onClick: () => {
                workspace.unpinFromTaskbar(app);
              },
            }
          : {
              label: '작업 표시줄에 고정',
              icon: MENU_ICONS.pin,
              onClick: () => {
                workspace.pinToTaskbar(app);
              },
            },
      );
    }
    return entries;
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
