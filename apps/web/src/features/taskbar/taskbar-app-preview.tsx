import type { TaskbarButtonIndicator } from '@seojaewan/design-system';
import type { JSX, ReactNode } from 'react';

import { Popover } from '@seojaewan/design-system';

import type { TaskbarAppId } from './taskbar-app';
import { TaskbarAppButton } from './taskbar-app';

type TaskbarAppPreviewProps = {
  /** 버튼이 가리키는 앱 */
  app: TaskbarAppId;
  /** 앱 버튼 아래 표시(피그마 TaskbarButton Indicator) */
  indicator?: TaskbarButtonIndicator;
  /** 피그마 State. true면 창 미리보기 목록을 연 모습(Open), false면 버튼만 보인다(Closed) */
  open?: boolean;
  /** 창 미리보기 목록 자리. 그 앱 창들의 `TaskbarWindowPreviewList`를 넣는다 */
  previews?: ReactNode;
};

/**
 * 작업 표시줄 앱 버튼과 그 창 미리보기 목록(피그마 조립 `Taskbar/AppPreview`)을 그린다.
 * 목록은 버튼 위 가운데 맞춤(피그마 Popover `Top-Center`)으로 띄운다. 마우스를 올리면 열기와 창 고르기·닫기는 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props
 */
export function TaskbarAppPreview(props: TaskbarAppPreviewProps): JSX.Element {
  const { app, indicator, open: isOpen = false, previews } = props;
  return (
    <Popover
      placement="top-center"
      open={isOpen}
      trigger={<TaskbarAppButton app={app} indicator={indicator} />}
      popup={previews}
    />
  );
}
