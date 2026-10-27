import type { TaskbarButtonIndicator } from '@seojaewan/design-system';
import type { JSX } from 'react';

import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-app/taskbar-app';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type TaskbarAppMenuProps = {
  /** 버튼이 가리키는 앱 */
  app: TaskbarAppId;
  /** 앱 버튼 아래 표시(피그마 TaskbarButton Indicator) */
  indicator?: TaskbarButtonIndicator;
  /** 피그마 State. true면 우클릭 메뉴(`Menu/TaskbarApp`)를 연 모습(Open), false면 버튼만 보인다(Closed) */
  open?: boolean;
  /** 우클릭 메뉴 항목(피그마 `Menu/TaskbarApp`) */
  menuItems: readonly MenuPopupEntry[];
};

/**
 * 작업 표시줄 앱 버튼과 그 우클릭 메뉴(피그마 조립 `Taskbar/AppMenu`)를 그린다.
 * 메뉴는 버튼 위 가운데 맞춤(피그마 Popover `Top-Center`)으로 연다. 우클릭으로 열고 닫기와 항목 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @param props
 */
export function TaskbarAppMenu(props: TaskbarAppMenuProps): JSX.Element {
  const { app, indicator, open: isOpen = false, menuItems } = props;
  return (
    <MenuButton
      open={isOpen}
      side="top"
      align="center"
      items={menuItems}
      trigger={<TaskbarAppButton app={app} indicator={indicator} />}
    />
  );
}
