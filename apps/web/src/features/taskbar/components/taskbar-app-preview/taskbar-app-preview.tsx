import type { TaskbarButtonIndicator } from '@seojaewan/design-system';
import type { JSX, MouseEventHandler, PointerEventHandler, ReactNode } from 'react';

import { Popover } from '@seojaewan/design-system';

import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-app/taskbar-app';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';

// 목록이 열려 있는 동안(data-preview-open) 앱 버튼을 TaskbarButton Hover 모습(테두리 control-stroke/default, 바탕 control-fill/default)으로
// 둔다. 창 미리보기는 마우스를 올려 여는 팝업이라 그동안 마우스가 버튼 위에 있다고 보기 때문이다. 버튼 동작이 없는 조립(스토리)에서도
// 보이도록 `aria-expanded` 대신 열림 표시를 따로 단다.
const OPEN_TRIGGER_CLASS_NAME =
  'data-preview-open:border-control-stroke-default data-preview-open:bg-control-fill-default';

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
  /** 버튼이나 미리보기에 포인터가 들어왔을 때 부른다. 마우스를 올려 미리보기를 여는 시간은 쓰는 곳이 잰다 */
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  /** 버튼과 미리보기 밖으로 포인터가 나갔을 때 부른다 */
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  /** 목록을 버튼이 아닌 작업 표시줄 위 가운데에 띄울지. 모바일에서 화면 폭에 맞춘 목록을 가운데 놓을 때 쓴다 */
  centered?: boolean;
};

/**
 * 작업 표시줄 앱 버튼과 그 창 미리보기 목록(피그마 조립 `Taskbar/AppPreview`)을 그린다.
 * 목록은 버튼 위 가운데 맞춤(피그마 Popover `Top-Center`)으로 띄운다. 열림 여부와 버튼 클릭 동작은 쓰는 곳이 prop으로 넣는다.
 * 열렸을 때 버튼의 `aria-expanded`가 true고 버튼은 Hover 모양이다(`data-preview-open` 변형 클래스, [[컴포넌트 목록:상태]]의 예외). 마우스를 올려 여닫는 시간은 쓰는 곳이 재고, 포인터 들어옴·나감만 받아 넘긴다.
 * `centered`면 목록의 기준을 버튼이 아닌 작업 표시줄(가장 가까운 위치 기준 조상)로 옮겨, 목록이 작업 표시줄 위 가운데에 뜬다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function TaskbarAppPreview(props: TaskbarAppPreviewProps): JSX.Element {
  const { app, indicator, open: isOpen = false, previews, centered: isCentered = false } = props;
  // 버튼 동작을 받으면 목록을 여닫는 버튼이라 열림 상태를 알린다.
  const isToggle = props.onButtonClick !== undefined;
  return (
    <Popover
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
      className={isCentered ? 'static' : undefined}
      placement="top-center"
      open={isOpen}
      trigger={
        <TaskbarAppButton
          app={app}
          indicator={indicator}
          data-preview-open={isOpen ? '' : undefined}
          className={OPEN_TRIGGER_CLASS_NAME}
          aria-expanded={isToggle ? isOpen : undefined}
          onClick={props.onButtonClick}
        />
      }
      popup={previews}
    />
  );
}
