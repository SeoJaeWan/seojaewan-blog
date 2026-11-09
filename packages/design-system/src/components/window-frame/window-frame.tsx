import type { ComponentProps, JSX, MouseEvent, PointerEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { CaptionButtonGroup } from '../caption-button-group/caption-button-group';
import { WindowTitle } from '../window-title/window-title';

export type WindowFrameTitleBar = 'default' | 'custom';

export type WindowFramePlacement = 'default' | 'maximized' | 'snapped';

export type WindowFrameMaterial = 'mica' | 'chrome';

type WindowFrameCommonProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  isInactive?: boolean;
  placement?: WindowFramePlacement;
  material?: WindowFrameMaterial;
  hasMaximize?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  onClose?: () => void;
  maximizeSlot?: ReactNode;
  onTitleBarDoubleClick?: () => void;
  onTitleBarPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
};

type WindowFrameDefaultTitleBarProps = WindowFrameCommonProps & {
  titleBar?: 'default';
  appIcon: ReactNode;
  title?: string;
  titleBarContent?: never;
};

type WindowFrameCustomTitleBarProps = WindowFrameCommonProps & {
  titleBar: 'custom';
  titleBarContent?: ReactNode;
  appIcon?: never;
  title?: never;
};

type WindowFrameProps = WindowFrameDefaultTitleBarProps | WindowFrameCustomTitleBarProps;

// 재질별 바탕 칠(피그마 칠 스타일)이다. 마이카 바탕은 반투명 색과 배경 흐림을 함께 건다.
const materialClassNames = {
  mica: 'material-mica-base',
  chrome: 'bg-color-gray-13',
} as const satisfies Record<WindowFrameMaterial, string>;

// 재질별 내용 자리(피그마 Content 슬롯) 칠이다. 마이카 창은 제목 표시줄만 재질이 비치고 본문은 불투명한 층을 깐다.
const contentClassNames = {
  mica: 'bg-color-gray-2',
  chrome: undefined,
} as const satisfies Record<WindowFrameMaterial, string | undefined>;

// 떠 있는 창(Placement=Default)의 효과 스타일이다. 마이카는 그림자와 배경 흐림을 함께 거는 Surface 스타일을 쓴다.
const activeShadowClassNames = {
  mica: 'surface-window-active-mica',
  chrome: 'shadow-elevation-window-active',
} as const satisfies Record<WindowFrameMaterial, string>;

const inactiveShadowClassNames = {
  mica: 'surface-window-inactive-mica',
  chrome: 'shadow-elevation-window-inactive',
} as const satisfies Record<WindowFrameMaterial, string>;

/**
 * 앱 창의 틀(피그마 WindowFrame)을 그린다. 제목 표시줄(WindowTitle 또는 앱이 채우는 자리)과 CaptionButtonGroup,
 * 내용 자리(children, 피그마 Content 슬롯)로 이뤄진다. 창 크기는 쓰는 곳이 className으로 정한다.
 * 떠 있는 창의 테두리는 피그마에서 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 기반:재질 효과]]
 * @codocs [[창 동작:창 조작]]
 * @param props 컴포넌트 속성
 * @param props.titleBar 피그마 Title bar. default는 앱 아이콘과 창 제목, custom은 앱이 채우는 높은 제목 표시줄이다. CaptionButtonGroup의 Title bar로도 넘겨 창 버튼 높이를 제목 표시줄에 맞춘다
 * @param props.appIcon (default 제목 표시줄) 피그마 App icon(WindowTitle에서 노출). 앱마다 다른 아이콘이라 꼭 넘긴다
 * @param props.title (default 제목 표시줄) 피그마 Title(WindowTitle에서 노출). 창 제목 글자다
 * @param props.titleBarContent (custom 제목 표시줄) 피그마 `Title bar content` 슬롯. 탭이나 주소창처럼 앱이 제목 표시줄을 채운다
 * @param props.isInactive 피그마 State=Inactive. 창이 활성 상태가 아니면 그림자를 줄이고 제목과 창 버튼을 흐리게 그린다
 * @param props.placement 피그마 Placement. default는 떠 있는 창, maximized·snapped는 화면에 붙어 모서리·테두리·그림자가 없다
 * @param props.material 피그마 Material. mica는 제목 표시줄에 창 재질이 비치고 내용 자리에 불투명한 층을 깔며, chrome은 Chrome 창 틀 색이다
 * @param props.hasMaximize 최대화(또는 복원) 버튼을 그린다(CaptionButtonGroup에 넘긴다). 늘 전체화면인 모바일 창은 끈다
 * @param props.onMinimize 최소화 버튼을 눌렀을 때
 * @param props.onMaximize 최대화 버튼을 눌렀을 때(placement가 default, snapped일 때)
 * @param props.onRestore 이전 크기로 복원 버튼을 눌렀을 때(placement가 maximized일 때)
 * @param props.onClose 닫기 버튼을 눌렀을 때
 * @param props.maximizeSlot 최대화(또는 복원) 버튼 자리에 그릴 것(CaptionButtonGroup에 넘긴다). placement가 maximized가 아닐 때 기본 최대화 버튼 대신 그린다
 * @param props.onTitleBarDoubleClick 제목 표시줄을 더블클릭했을 때. 창 버튼 위에서 한 더블클릭은 부르지 않는다
 * @param props.onTitleBarPointerDown 제목 표시줄을 눌렀을 때(창 끌기 시작). 창 버튼 위에서 누른 것은 부르지 않는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.children 피그마 `Content` 슬롯. 앱 내용이 채운다
 */
export function WindowFrame({
  titleBar = 'default',
  appIcon,
  title,
  titleBarContent,
  isInactive = false,
  placement = 'default',
  material = 'mica',
  hasMaximize = true,
  onMinimize: handleMinimize,
  onMaximize: handleMaximize,
  onRestore: handleRestore,
  onClose: handleClose,
  maximizeSlot,
  onTitleBarDoubleClick: handleTitleBarDoubleClick,
  onTitleBarPointerDown: handleTitleBarPointerDown,
  className,
  children,
  ...divProps
}: WindowFrameProps): JSX.Element {
  const isFloating = placement === 'default';
  const isCustom = titleBar === 'custom';
  // 창 버튼 위의 더블클릭과, 포털로 그린 팝업(스냅 레이아웃 등)에서 올라온 더블클릭은 제목 표시줄 동작이 아니다.
  /**
   * 제목 표시줄 더블클릭을 받아, 제목 표시줄 DOM 안이고 창 버튼 위가 아닐 때만 콜백을 부른다.
   * @param event 더블클릭 이벤트
   */
  function handleTitleBarDoubleClickEvent(event: MouseEvent<HTMLDivElement>): void {
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) {
      return;
    }
    if (event.target instanceof Element && event.target.closest('button') !== null) {
      return;
    }
    handleTitleBarDoubleClick?.();
  }
  /**
   * 제목 표시줄 누르기를 받아, 창 버튼 위가 아닐 때만 콜백을 부른다. 더블클릭과 같은 기준이다.
   * 포털로 그린 팝업(스냅 레이아웃 등)에서 누른 것도 React 이벤트로 올라오므로, 제목 표시줄 DOM 안에서 누른 것만 받는다.
   * @param event 누르기 이벤트
   */
  function handleTitleBarPointerDownEvent(event: PointerEvent<HTMLDivElement>): void {
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) {
      return;
    }
    if (event.target instanceof Element && event.target.closest('button') !== null) {
      return;
    }
    handleTitleBarPointerDown?.(event);
  }
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col overflow-clip',
        materialClassNames[material],
        isFloating && [
          'rounded-radius-overlay border-stroke-width-default border-color-gray-51-40',
          (isInactive ? inactiveShadowClassNames : activeShadowClassNames)[material],
        ],
        className,
      )}
    >
      <div
        onDoubleClick={
          handleTitleBarDoubleClick === undefined ? undefined : handleTitleBarDoubleClickEvent
        }
        onPointerDown={
          handleTitleBarPointerDown === undefined ? undefined : handleTitleBarPointerDownEvent
        }
        className={cn(
          'flex w-full shrink-shrink-none items-start overflow-clip',
          isCustom ? 'h-size-window-tall-title-bar-height' : 'h-size-window-title-bar-height',
        )}
      >
        {isCustom ? (
          <div className="flex min-w-size-none flex-flex-fill items-end self-stretch overflow-clip px-spacing-sm pt-spacing-sm">
            {titleBarContent}
          </div>
        ) : (
          <WindowTitle
            appIcon={appIcon}
            title={title}
            isInactive={isInactive}
            className="min-w-size-none flex-flex-fill"
          />
        )}
        <CaptionButtonGroup
          placement={placement}
          titleBar={titleBar}
          isInactive={isInactive}
          hasMaximize={hasMaximize}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onRestore={handleRestore}
          maximizeSlot={maximizeSlot}
          onClose={handleClose}
          className="shrink-shrink-none"
        />
      </div>
      <div
        className={cn(
          'flex min-h-size-none w-full flex-flex-fill flex-col items-center justify-center overflow-clip',
          contentClassNames[material],
        )}
      >
        {children}
      </div>
    </div>
  );
}
