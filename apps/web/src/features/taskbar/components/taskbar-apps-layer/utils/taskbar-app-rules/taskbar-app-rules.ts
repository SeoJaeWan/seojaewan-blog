// 작업 표시줄이 그릴 앱 버튼과 우클릭 메뉴 항목을 정하는 규칙을 React 밖의 순수 함수로 둔다.

import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  MENU_ICONS,
  MENU_SEPARATOR,
  taskbarPinMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import type { WindowApp, WindowState } from '@/shared/utils/window-rules/window-rules';

/** 앱 버튼 우클릭 메뉴에서 고를 수 있는 일 */
export type TaskbarAppMenuAction = 'open-new' | 'pin' | 'unpin' | 'close-windows';

/** 앱 버튼 우클릭 메뉴가 보이는 상태와 동작 */
type TaskbarAppMenuOptions = {
  /** 버튼의 앱 */
  app: WindowApp;
  /** 작업 표시줄에 고정했는지 */
  isPinned: boolean;
  /** 그 앱의 열린 창 개수 */
  windowCount: number;
  /** 항목을 고르면 그 일과 함께 부른다 */
  onAction: (action: TaskbarAppMenuAction) => void;
};

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
 * 앱 버튼 우클릭 메뉴(피그마 `Menu/TaskbarApp`)의 항목을 만든다. 앱 이름(누르면 새 창), 구분선, 작업 표시줄에 고정 또는 고정 해제,
 * 창 닫기(창이 여러 개면 모든 창 닫기, 창이 없으면 항목을 숨긴다) 차례다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 앱과 창 상태, 동작
 * @returns 메뉴 항목
 */
export function getTaskbarAppMenu(options: TaskbarAppMenuOptions): MenuPopupEntry[] {
  const { app, isPinned, windowCount, onAction } = options;
  const entries: MenuPopupEntry[] = [
    {
      label: taskbarApps[app].label,
      icon: taskbarApps[app].icon,
      onClick: () => {
        onAction('open-new');
      },
    },
    MENU_SEPARATOR,
    taskbarPinMenuItem(isPinned, () => {
      onAction(isPinned ? 'unpin' : 'pin');
    }),
  ];
  if (windowCount > 0) {
    entries.push({
      label: windowCount > 1 ? '모든 창 닫기' : '창 닫기',
      icon: MENU_ICONS.dismiss,
      onClick: () => {
        onAction('close-windows');
      },
    });
  }
  return entries;
}
