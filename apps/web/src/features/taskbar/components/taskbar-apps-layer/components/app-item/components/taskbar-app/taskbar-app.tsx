import type { ComponentProps, JSX } from 'react';

import { TaskbarButton } from '@seojaewan/design-system';

import { TaskbarAppIcon } from '@/features/taskbar/components/taskbar-app-icon/taskbar-app-icon';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import { taskbarApps } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';

type TaskbarAppButtonProps = Omit<
  ComponentProps<typeof TaskbarButton>,
  'icon' | 'label' | 'children'
> & {
  app: TaskbarAppId;
};

/**
 * 작업 표시줄 앱 버튼 하나(피그마 조립의 `File Explorer`, `Chrome` TaskbarButton 인스턴스)를 그린다.
 * 최소화·복원 모션이 버튼 자리를 찾을 수 있게 `data-taskbar-app`에 앱 id를 단다.
 * 우클릭 메뉴나 창 미리보기를 여는 조립(`TaskbarAppItem`)의 트리거로도 쓴다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @param props 컴포넌트 속성
 * @param props.app 버튼이 가리키는 앱
 */
export function TaskbarAppButton({ app, ...buttonProps }: TaskbarAppButtonProps): JSX.Element {
  return (
    <TaskbarButton
      {...buttonProps}
      data-taskbar-app={app}
      label={taskbarApps[app].label}
      icon={<TaskbarAppIcon app={app} />}
    />
  );
}
