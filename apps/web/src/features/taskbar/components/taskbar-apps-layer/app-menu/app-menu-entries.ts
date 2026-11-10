import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MENU_ICONS, taskbarPinMenuItem } from '@/shared/utils/menu-items/menu-items';
import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/** 앱 버튼 우클릭 메뉴에서 고를 수 있는 일 */
export type TaskbarAppMenuAction = 'open-new' | 'pin' | 'unpin' | 'close-windows';

/** 앱 버튼 우클릭 메뉴가 보이는 상태와 동작. onAction은 항목을 고르면 그 일과 함께 부른다. */
type TaskbarAppMenuOptions = {
  app: WindowApp;
  isPinned: boolean;
  windowCount: number;
  onAction: (action: TaskbarAppMenuAction) => void;
};

/**
 * 앱 버튼 우클릭 메뉴(피그마 `Menu/TaskbarApp`)의 항목을 만든다. 앱 이름(누르면 새 창), 작업 표시줄에 고정 또는 제거,
 * 창 닫기(창이 여러 개면 모든 창 닫기, 창이 없으면 항목을 숨긴다) 차례다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 앱과 창 상태, 동작
 * @returns 메뉴 항목
 */
export function getAppMenuEntries(options: TaskbarAppMenuOptions): MenuPopupEntry[] {
  const { app, isPinned, windowCount, onAction } = options;
  const entries: MenuPopupEntry[] = [
    {
      label: taskbarApps[app].label,
      icon: taskbarApps[app].icon,
      onClick: () => {
        onAction('open-new');
      },
    },
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
