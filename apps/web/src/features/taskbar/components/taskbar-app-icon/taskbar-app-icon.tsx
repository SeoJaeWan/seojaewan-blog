import type { JSX } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';

type TaskbarAppIconProps = {
  /** 앱 */
  app: TaskbarAppId;
};

/**
 * 앱 아이콘(16px 자리 등 쓰는 곳이 크기를 정한다)을 그린다.
 * @param props
 */
export function TaskbarAppIcon(props: TaskbarAppIconProps): JSX.Element {
  return <ImageAsset name={taskbarApps[props.app].icon} className="size-full object-contain" />;
}
