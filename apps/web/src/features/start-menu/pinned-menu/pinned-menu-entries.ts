import type { MenuPopupCommand, MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  MENU_ICONS,
  MENU_SEPARATOR,
  openMenuItem,
  startPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';

/** 고정 칸이 고를 수 있는 이동 메뉴. 앞으로 이동은 맨 앞 칸으로, 왼쪽·오른쪽으로 이동은 옆 칸과 자리를 바꾼다. */
export type PinnedMoves = {
  canMoveToFront: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
};

/** 고정 항목 메뉴가 보이는 상태와 동작. moves는 위치로 고를 수 있는 이동 메뉴이고 canCopyLink는 링크를 복사할 수 있는 항목인지(글과 외부 링크)다. 이동 메뉴는 그 동작을 받았을 때만 보인다. */
type PinnedMenuOptions = {
  moves: PinnedMoves;
  canCopyLink: boolean;
  onOpen: () => void;
  onMoveToFront?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onCopyLink: () => void;
  onUnpin: () => void;
};

/**
 * 화면에 보이는 고정 칸의 위치로 고를 수 있는 이동 메뉴를 정한다. 첫 칸은 오른쪽으로, 둘째 칸은 왼쪽·오른쪽으로,
 * 마지막 칸은 앞으로·왼쪽으로(둘째 칸이 마지막이면 왼쪽으로만), 그 밖의 칸은 셋 다 고를 수 있다. 칸이 하나면 없다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param index 화면에 보이는 순서의 위치(0부터)
 * @param count 화면에 보이는 고정 칸 수
 * @returns 고를 수 있는 이동 메뉴
 */
export function getPinnedMoves(index: number, count: number): PinnedMoves {
  return {
    canMoveToFront: index >= 2,
    canMoveLeft: index >= 1,
    canMoveRight: index < count - 1,
  };
}

/**
 * 고정 항목의 우클릭 메뉴(피그마 `Menu/StartTile`) 항목을 만든다. 열기, 이동 메뉴(앞으로·왼쪽으로·오른쪽으로 이동 중 고를 수 있는 것만),
 * 링크 복사(글과 외부 링크만), 고정 해제다. 고를 수 없는 이동 메뉴는 흐리게 하지 않고 숨긴다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 고정 항목의 상태와 동작
 * @returns 메뉴 항목
 */
export function getPinnedMenuEntries(options: PinnedMenuOptions): MenuPopupEntry[] {
  const { moves } = options;
  return [
    openMenuItem(options.onOpen),
    ...moveMenuItem(
      '앞으로 이동',
      MENU_ICONS.arrowUpLeft,
      moves.canMoveToFront,
      options.onMoveToFront,
    ),
    ...moveMenuItem('왼쪽으로 이동', MENU_ICONS.arrowLeft, moves.canMoveLeft, options.onMoveLeft),
    ...moveMenuItem(
      '오른쪽으로 이동',
      MENU_ICONS.arrowRight,
      moves.canMoveRight,
      options.onMoveRight,
    ),
    ...(options.canCopyLink ? [copyLinkMenuItem(options.onCopyLink)] : []),
    MENU_SEPARATOR,
    startPinMenuItem(true, options.onUnpin),
  ];
}

/**
 * 이동 메뉴 항목 하나를 만든다. 위치로 고를 수 없거나 동작을 받지 않았으면 숨긴다(빈 배열).
 * @param label 항목 이름
 * @param icon 항목 아이콘
 * @param canMove 위치로 고를 수 있는지
 * @param onClick 골랐을 때 할 일
 * @returns 항목 하나나 빈 배열
 */
function moveMenuItem(
  label: string,
  icon: MenuPopupCommand['icon'],
  canMove: boolean,
  onClick: (() => void) | undefined,
): MenuPopupEntry[] {
  return canMove && onClick !== undefined ? [{ label, icon, onClick }] : [];
}
