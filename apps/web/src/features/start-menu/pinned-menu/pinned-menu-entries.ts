import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  MENU_ICONS,
  MENU_SEPARATOR,
  openMenuItem,
  startPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';

/** 고정 항목 메뉴가 보이는 상태와 동작. canMoveToFront는 맨 앞으로 옮길 수 있는지(이미 맨 앞이면 옮길 수 없다)이고 canCopyLink는 링크를 복사할 수 있는 항목인지(글과 외부 링크)다. */
type PinnedMenuOptions = {
  canMoveToFront: boolean;
  canCopyLink: boolean;
  onOpen: () => void;
  onMoveToFront: () => void;
  onCopyLink: () => void;
  onUnpin: () => void;
};

/**
 * 고정 항목의 우클릭 메뉴(피그마 `Menu/StartTile`) 항목을 만든다. 열기, 맨 앞으로 이동(이미 맨 앞이면 고를 수 없다),
 * 링크 복사(글과 외부 링크만), 고정 해제다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 고정 항목의 상태와 동작
 * @returns 메뉴 항목
 */
export function getPinnedMenuEntries(options: PinnedMenuOptions): MenuPopupEntry[] {
  return [
    openMenuItem(options.onOpen),
    {
      label: '맨 앞으로 이동',
      icon: MENU_ICONS.arrowUp,
      isDisabled: !options.canMoveToFront,
      onClick: options.onMoveToFront,
    },
    ...(options.canCopyLink ? [copyLinkMenuItem(options.onCopyLink)] : []),
    MENU_SEPARATOR,
    startPinMenuItem(true, options.onUnpin),
  ];
}
