import type { StartAllView } from '@/features/start-menu/components/start-body/start-body';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  MENU_ICONS,
  MENU_SEPARATOR,
  openMenuItem,
  startPinMenuItem,
  taskbarPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';

/** 고정 항목 메뉴가 보이는 상태와 동작 */
type PinnedMenuOptions = {
  /** 맨 앞으로 옮길 수 있는지(이미 맨 앞이면 옮길 수 없다) */
  canMoveToFront: boolean;
  /** 링크를 복사할 수 있는 항목인지(글과 외부 링크) */
  canCopyLink: boolean;
  /** 열기 */
  onOpen: () => void;
  /** 맨 앞으로 이동 */
  onMoveToFront: () => void;
  /** 링크 복사 */
  onCopyLink: () => void;
  /** 시작 화면에서 고정 해제 */
  onUnpin: () => void;
};

/** 모두 목록 항목 메뉴가 보이는 상태와 동작 */
type ListMenuOptions = {
  /** 이미 Start 고정됨에 있는지 */
  isPinnedToStart: boolean;
  /** 링크를 복사할 수 있는 항목인지(글과 외부 링크) */
  canCopyLink: boolean;
  /** 앱이면 작업 표시줄에 고정됐는지. 앱이 아니면 undefined라 작업 표시줄 고정 항목이 없다 */
  isPinnedToTaskbar: boolean | undefined;
  /** 열기 */
  onOpen: () => void;
  /** 시작 화면에 고정·고정 해제 */
  onToggleStartPin: () => void;
  /** 링크 복사 */
  onCopyLink: () => void;
  /** 작업 표시줄에 고정·고정 해제 */
  onToggleTaskbarPin: () => void;
};

// `보기:` 메뉴의 선택지다(피그마 `Menu/ViewOptions`). 범주, 그리드, 간단히 차례다.
const viewMenuOptions = [
  { view: 'category', label: '범주' },
  { view: 'grid', label: '그리드' },
  { view: 'list', label: '간단히' },
] as const satisfies readonly { view: StartAllView; label: string }[];

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
      disabled: !options.canMoveToFront,
      onClick: options.onMoveToFront,
    },
    ...(options.canCopyLink ? [copyLinkMenuItem(options.onCopyLink)] : []),
    MENU_SEPARATOR,
    startPinMenuItem(true, options.onUnpin),
  ];
}

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

/**
 * 모두 목록의 `보기:` 메뉴(피그마 `Menu/ViewOptions`) 항목을 만든다. 지금 보기에 확인 표시를 한다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param view 지금 보기
 * @param onViewSelect 보기를 고르면 부른다
 * @returns 메뉴 항목
 */
export function getViewMenuEntries(
  view: StartAllView,
  onViewSelect: (view: StartAllView) => void,
): MenuPopupEntry[] {
  return viewMenuOptions.map(
    /**
     * 보기 하나의 메뉴 항목을 만든다.
     * @param option 보기와 이름
     * @returns 메뉴 항목
     */
    (option): MenuPopupEntry => ({
      kind: 'checkbox',
      label: option.label,
      checked: option.view === view,
      onCheckedChange: () => {
        onViewSelect(option.view);
      },
    }),
  );
}

/**
 * 전원 메뉴(피그마 `Menu/Power`) 항목을 만든다. 절전과 시스템 종료는 두지 않는다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[작업 공간:다시 시작]]
 * @codocs [[디자인 시스템:조립]]
 * @param onRestart 다시 시작을 고르면 부른다
 * @returns 메뉴 항목
 */
export function getPowerMenuEntries(onRestart: () => void): MenuPopupEntry[] {
  return [{ label: '다시 시작', icon: MENU_ICONS.refresh, onClick: onRestart }];
}
