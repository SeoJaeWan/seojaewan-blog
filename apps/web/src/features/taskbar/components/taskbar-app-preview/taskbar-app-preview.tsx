import type { TaskbarButtonIndicator } from '@seojaewan/design-system';
import type { JSX, MouseEventHandler, ReactNode } from 'react';

import { Popover } from '@seojaewan/design-system';

import type { TaskbarAppId } from '@/features/taskbar/components/taskbar-app/taskbar-app';
import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-app/taskbar-app';

type TaskbarAppPreviewProps = {
  /** 버튼이 가리키는 앱 */
  app: TaskbarAppId;
  /** 앱 버튼 아래 표시(피그마 TaskbarButton Indicator) */
  indicator?: TaskbarButtonIndicator;
  /** 피그마 State. true면 창 미리보기 목록을 연 모습(Open), false면 버튼만 보인다(Closed) */
  open?: boolean;
  /** 창 미리보기 목록 자리. 그 앱 창들의 `TaskbarWindowPreviewList`를 넣는다 */
  previews?: ReactNode;
  /** 앱 버튼을 눌렀을 때 부른다. 목록을 열고 닫는 일은 쓰는 곳이 한다 */
  onButtonClick?: MouseEventHandler<HTMLButtonElement>;
};

/**
 * 작업 표시줄 앱 버튼과 그 창 미리보기 목록(피그마 조립 `Taskbar/AppPreview`)을 그린다.
 * 목록은 버튼 위 가운데 맞춤(피그마 Popover `Top-Center`)으로 띄운다. 열림 여부와 버튼 클릭 동작은 쓰는 곳이 prop으로 넣는다.
 * 열렸을 때 버튼의 `aria-expanded`가 true다. 마우스를 올리면 여는 동작은 아직 두지 않는다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props
 */
export function TaskbarAppPreview(props: TaskbarAppPreviewProps): JSX.Element {
  const { app, indicator, open: isOpen = false, previews } = props;
  // 버튼 동작을 받으면 목록을 여닫는 버튼이라 열림 상태를 알린다.
  const isToggle = props.onButtonClick !== undefined;
  return (
    <Popover
      placement="top-center"
      open={isOpen}
      trigger={
        <TaskbarAppButton
          app={app}
          indicator={indicator}
          aria-expanded={isToggle ? isOpen : undefined}
          onClick={props.onButtonClick}
        />
      }
      popup={previews}
    />
  );
}
