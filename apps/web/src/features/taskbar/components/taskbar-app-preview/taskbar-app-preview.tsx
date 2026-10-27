import type { TaskbarButtonIndicator } from '@seojaewan/design-system';
import type { DragEvent, JSX, MouseEventHandler, PointerEventHandler, ReactNode } from 'react';

import { Popover } from '@seojaewan/design-system';

import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-app/taskbar-app';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

// 목록이 열려 있는 동안(data-preview-open) 앱 버튼을 TaskbarButton Hover 모습(테두리 control-stroke/default, 바탕 control-fill/default)으로
// 둔다. 창 미리보기는 마우스를 올려 여는 팝업이라 그동안 마우스가 버튼 위에 있다고 보기 때문이다. 버튼 동작이 없는 조립(스토리)에서도
// 보이도록 `aria-expanded` 대신 열림 표시를 따로 단다.
const OPEN_TRIGGER_CLASS_NAME =
  'data-preview-open:border-control-stroke-default data-preview-open:bg-control-fill-default';

// 우클릭 메뉴(Menu/TaskbarApp)는 피그마 Popover `Top-Center`처럼 버튼 위 가운데에 붙는다. 버튼과 메뉴 사이 간격은 spacing/4다.
const MENU_PLACEMENT = { side: 'top', align: 'center', offset: 4 } as const;

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
  /** 앱 버튼을 우클릭(모바일은 길게 누르기)하면 버튼 위 가운데에 띄울 메뉴 항목(피그마 `Menu/TaskbarApp`). 주지 않으면 메뉴가 없다 */
  menuItems?: readonly MenuPopupEntry[];
  /** 우클릭 메뉴가 열렸는지. 쓰는 곳이 정한다 */
  isMenuOpen?: boolean;
  /** 우클릭 메뉴를 열거나 닫으려 할 때 부른다(우클릭, 길게 누르기, Esc, 바깥 클릭, 항목 고르기) */
  onMenuOpenChange?: (isOpen: boolean) => void;
  /** 우클릭 메뉴를 버튼 위 가운데가 아니라 누른 자리 근처에 띄울지. 모바일에서 길게 누르기 메뉴를 누른 자리 근처에 띄울 때 쓴다 */
  isMenuAtPointer?: boolean;
  /** 앱 버튼 위에서 포인터를 눌렀을 때 부른다. 쓰는 곳이 끌어 순서 바꾸기를 시작한다 */
  onButtonPointerDown?: PointerEventHandler<HTMLButtonElement>;
  /** 목록을 버튼이 아닌 작업 표시줄 위 가운데에 띄울지. 모바일에서 화면 폭에 맞춘 목록을 가운데 놓을 때 쓴다 */
  centered?: boolean;
};

/**
 * 작업 표시줄 앱 버튼과 그 창 미리보기 목록(피그마 조립 `Taskbar/AppPreview`)을 그린다.
 * 목록은 버튼 위 가운데 맞춤(피그마 Popover `Top-Center`)으로 띄운다. 열림 여부와 버튼 클릭 동작은 쓰는 곳이 prop으로 넣는다.
 * 열렸을 때 버튼의 `aria-expanded`가 true고 버튼은 Hover 모양이다(`data-preview-open` 변형 클래스, [[컴포넌트 목록:상태]]의 예외). 마우스를 올려 여닫는 시간은 쓰는 곳이 재고, 포인터 들어옴·나감만 받아 넘긴다.
 * `menuItems`를 주면 버튼을 우클릭(모바일은 길게 누르기)할 때 같은 `Top-Center` 자리에 우클릭 메뉴를 연다(`isMenuAtPointer`면 누른 자리 근처). 메뉴가 열려 있는 동안 버튼은 `Rest` 모양 그대로다
 * ([[컴포넌트 목록:상태]]). 창 미리보기가 마우스를 올려 여는 팝업이라 `Hover`인 것과 다르다.
 * `centered`면 목록의 기준을 버튼이 아닌 작업 표시줄(가장 가까운 위치 기준 조상)로 옮겨, 목록이 작업 표시줄 위 가운데에 뜬다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @param props
 */
export function TaskbarAppPreview(props: TaskbarAppPreviewProps): JSX.Element {
  const { app, indicator, open: isOpen = false, previews, centered: isCentered = false } = props;
  // 버튼 동작을 받으면 목록을 여닫는 버튼이라 열림 상태를 알린다.
  const isToggle = props.onButtonClick !== undefined;

  /**
   * 아이콘 그림의 기본 끌기(그림 끌어 놓기)를 막는다. 막지 않으면 앱 버튼을 끌 때 브라우저가 그림 끌기를 시작해 포인터 이벤트가 끊긴다.
   * @param event 끌기 이벤트
   */
  function handleDragStart(event: DragEvent): void {
    event.preventDefault();
  }

  const button = (
    <TaskbarAppButton
      app={app}
      indicator={indicator}
      data-preview-open={isOpen ? '' : undefined}
      className={OPEN_TRIGGER_CLASS_NAME}
      aria-expanded={isToggle ? isOpen : undefined}
      onClick={props.onButtonClick}
      onPointerDown={props.onButtonPointerDown}
      onDragStart={handleDragStart}
    />
  );

  /**
   * 우클릭 메뉴가 열리거나 닫히려 하면 쓰는 곳에 알린다.
   * @param isMenuOpenNext 열리려는지
   */
  function handleMenuOpenChange(isMenuOpenNext: boolean): void {
    props.onMenuOpenChange?.(isMenuOpenNext);
  }

  return (
    <Popover
      onPointerEnter={props.onPointerEnter}
      onPointerLeave={props.onPointerLeave}
      className={isCentered ? 'static' : undefined}
      placement="top-center"
      open={isOpen}
      trigger={
        props.menuItems === undefined ? (
          button
        ) : (
          <ContextMenuArea
            area={button}
            open={props.isMenuOpen ?? false}
            onOpenChange={handleMenuOpenChange}
            items={props.menuItems}
            placement={props.isMenuAtPointer === true ? undefined : MENU_PLACEMENT}
          />
        )
      }
      popup={previews}
    />
  );
}
