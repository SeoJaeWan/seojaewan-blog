import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  MENU_SEPARATOR,
  openMenuItem,
  startPinMenuItem,
  taskbarPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';

/** 모두 목록 항목 메뉴가 보이는 상태와 동작. canCopyLink는 링크를 복사할 수 있는 항목인지(글과 외부 링크)다. isPinnedToTaskbar는 앱이면 작업 표시줄에 고정됐는지이며 앱이 아니면 undefined라 작업 표시줄 고정 항목이 없다. */
type ListMenuOptions = {
  isPinnedToStart: boolean;
  canCopyLink: boolean;
  isPinnedToTaskbar: boolean | undefined;
  onOpen: () => void;
  onToggleStartPin: () => void;
  onCopyLink: () => void;
  onToggleTaskbarPin: () => void;
};

/**
 * 모두 목록 항목의 우클릭 메뉴(피그마 `Menu/StartListApp`·`Menu/StartListPost`) 항목을 만든다. 열기, 시작 화면에 고정(이미 고정됐으면
 * 고정 해제), 링크 복사(글과 외부 링크만), 작업 표시줄에 고정(앱만, 이미 고정됐으면 고정 해제)이다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 모두 목록 항목의 상태와 동작
 * @returns 메뉴 항목
 */
export function getListMenuEntries(options: ListMenuOptions): MenuPopupEntry[] {
  return [
    openMenuItem(options.onOpen),
    MENU_SEPARATOR,
    startPinMenuItem(options.isPinnedToStart, options.onToggleStartPin),
    ...(options.canCopyLink ? [copyLinkMenuItem(options.onCopyLink)] : []),
    ...(options.isPinnedToTaskbar === undefined
      ? []
      : [taskbarPinMenuItem(options.isPinnedToTaskbar, options.onToggleTaskbarPin)]),
  ];
}
