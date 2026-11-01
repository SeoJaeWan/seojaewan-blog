import type { ReactElement } from 'react';

import { TaskbarAppIcon } from '@/features/taskbar/components/taskbar-app-icon/taskbar-app-icon';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';

/**
 * shell이 창 앱 아이콘 자리에 넘기는 앱 아이콘을 그린다.
 * @param app 앱
 * @returns TaskbarAppIcon
 */
export function renderTaskbarAppIcon(app: TaskbarAppId): ReactElement {
  return <TaskbarAppIcon app={app} />;
}
