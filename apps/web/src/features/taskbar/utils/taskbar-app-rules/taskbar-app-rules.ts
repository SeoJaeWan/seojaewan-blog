// 작업 표시줄이 그릴 앱 버튼과 우클릭 메뉴 항목을 정하는 규칙을 React 밖의 순수 함수로 둔다.

import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import type { MenuPopupCommand } from '@/shared/components/menu-popup/menu-popup';
import type { WindowApp, WindowState } from '@/shared/utils/window-rules/window-rules';
import { getAppWindows } from '@/shared/utils/window-rules/window-rules';

/** 앱 버튼 우클릭 메뉴에서 고를 수 있는 일 */
export type TaskbarAppMenuAction = 'open-new' | 'pin' | 'unpin' | 'close-windows';

/** 우클릭 메뉴 항목 하나. 고르면 할 일(`action`)과 보이는 이름·아이콘이다 */
export type TaskbarAppMenuItem = {
  /** 고르면 할 일 */
  action: TaskbarAppMenuAction;
  /** 항목 이름 */
  label: string;
  /** 이름 앞 아이콘 자산 */
  icon: MenuPopupCommand['icon'];
};

/** 우클릭 메뉴 한 줄. 항목이거나 구분선이다 */
export type TaskbarAppMenuLine = TaskbarAppMenuItem | { kind: 'separator' };

// 메뉴 항목 아이콘이다(피그마 `Menu/TaskbarApp`). 앱 이름 줄의 아이콘은 앱마다 다르다.
const MENU_ICONS = {
  pin: 'icons/ic_fluent_pin_20_regular.svg',
  close: 'icons/ic_fluent_dismiss_20_regular.svg',
} as const;

/**
 * 작업 표시줄에 그릴 앱을 차례대로 정한다. 고정한 앱을 고정 순서대로 먼저 그리고, 고정하지 않았지만 창이 열린 앱을
 * 그 뒤에 처음 연 창의 순서대로 붙인다. 고정을 해제한 앱은 창을 모두 닫으면 목록에서 빠진다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param pins 고정한 앱(고정 순서)
 * @param state 창 저장소 상태
 * @returns 그릴 앱
 */
export function getTaskbarApps(pins: readonly WindowApp[], state: WindowState): WindowApp[] {
  const running = Object.values(state.windows)
    .toSorted((left, right) => left.serial - right.serial)
    .map((window) => window.app);
  const extras = [...new Set(running)].filter((app) => !pins.includes(app));
  return [...pins, ...extras];
}

/**
 * 앱 버튼 우클릭 메뉴의 항목을 정한다. 앱 이름(누르면 새 창), 구분선, 작업 표시줄에 고정 또는 고정 해제,
 * 창 닫기(창이 여러 개면 모든 창 닫기, 창이 없으면 항목을 숨긴다) 차례다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @param state 창 저장소 상태
 * @param app 버튼의 앱
 * @param isPinned 작업 표시줄에 고정했는지
 * @returns 메뉴 줄
 */
export function getTaskbarAppMenu(
  state: WindowState,
  app: WindowApp,
  isPinned: boolean,
): TaskbarAppMenuLine[] {
  const windowCount = getAppWindows(state, app).length;
  const lines: TaskbarAppMenuLine[] = [
    { action: 'open-new', label: taskbarApps[app].label, icon: taskbarApps[app].icon },
    { kind: 'separator' },
    isPinned
      ? { action: 'unpin', label: '작업 표시줄에서 고정 해제', icon: MENU_ICONS.pin }
      : { action: 'pin', label: '작업 표시줄에 고정', icon: MENU_ICONS.pin },
  ];
  if (windowCount > 0) {
    lines.push({
      action: 'close-windows',
      label: windowCount > 1 ? '모든 창 닫기' : '창 닫기',
      icon: MENU_ICONS.close,
    });
  }
  return lines;
}
