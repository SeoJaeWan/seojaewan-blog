import type { ComponentProps, JSX, ReactElement } from 'react';

import { ImageAsset, TaskbarButton } from '@seojaewan/design-system';

/** 작업 표시줄에 버튼을 두는 앱. 처음에 고정된 앱(File Explorer, Chrome)이다 */
export type TaskbarAppId = 'file-explorer' | 'chrome';

// 앱마다 버튼 아이콘(피그마 app/* 인스턴스)과 접근성 이름이다.
const taskbarApps = {
  'file-explorer': { label: '파일 탐색기', icon: 'images/app-file-explorer.png' },
  chrome: { label: 'Chrome', icon: 'images/app-chrome.png' },
} as const satisfies Record<TaskbarAppId, { label: string; icon: string }>;

/**
 * 앱 아이콘(16px 자리 등 쓰는 곳이 크기를 정한다)을 그린다.
 * @param app 앱
 * @returns ImageAsset
 */
export function renderTaskbarAppIcon(app: TaskbarAppId): ReactElement {
  return <ImageAsset name={taskbarApps[app].icon} className="size-full object-contain" />;
}

type TaskbarAppButtonProps = Omit<
  ComponentProps<typeof TaskbarButton>,
  'icon' | 'label' | 'children'
> & {
  /** 버튼이 가리키는 앱 */
  app: TaskbarAppId;
};

/**
 * 작업 표시줄 앱 버튼 하나(피그마 조립의 `File Explorer`, `Chrome` TaskbarButton 인스턴스)를 그린다.
 * 최소화·복원 모션이 버튼 자리를 찾을 수 있게 `data-taskbar-app`에 앱 id를 단다.
 * 우클릭 메뉴나 창 미리보기를 여는 조립(`TaskbarAppMenu`, `TaskbarAppPreview`)의 트리거로도 쓴다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @param props
 */
export function TaskbarAppButton(props: TaskbarAppButtonProps): JSX.Element {
  const { app, ...buttonProps } = props;
  return (
    <TaskbarButton
      {...buttonProps}
      data-taskbar-app={app}
      label={taskbarApps[app].label}
      icon={renderTaskbarAppIcon(app)}
    />
  );
}
