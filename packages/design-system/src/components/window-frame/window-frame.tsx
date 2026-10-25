import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { CaptionButtonGroup } from '../caption-button-group/caption-button-group';
import { WindowTitle } from '../window-title/window-title';

export type WindowFrameTitleBar = 'default' | 'custom';

export type WindowFramePlacement = 'normal' | 'maximized' | 'snapped';

export type WindowFrameMaterial = 'mica' | 'solid' | 'chrome';

type WindowFrameCommonProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State=Inactive. 창이 활성 상태가 아니면 그림자를 줄이고 제목과 창 버튼을 흐리게 그린다 */
  inactive?: boolean;
  /** 피그마 Placement. normal은 떠 있는 창, maximized·snapped는 화면에 붙어 모서리·테두리·그림자가 없다 */
  placement?: WindowFramePlacement;
  /** 피그마 Material. mica는 창 재질, solid는 투명 효과를 끈 단색, chrome은 Chrome 창 틀 색이다 */
  material?: WindowFrameMaterial;
  /** 최소화 버튼을 눌렀을 때 */
  onMinimize?: () => void;
  /** 최대화 버튼을 눌렀을 때(placement가 normal, snapped일 때) */
  onMaximize?: () => void;
  /** 이전 크기로 복원 버튼을 눌렀을 때(placement가 maximized일 때) */
  onRestore?: () => void;
  /** 닫기 버튼을 눌렀을 때 */
  onClose?: () => void;
  /** 피그마 `Content` 슬롯. 앱 내용이 채운다 */
  children?: ReactNode;
};

type WindowFrameDefaultTitleBarProps = WindowFrameCommonProps & {
  /** 피그마 Title bar. default는 앱 아이콘과 창 제목, custom은 앱이 채우는 제목 표시줄이다 */
  titleBar?: 'default';
  /** 피그마 App icon(WindowTitle에서 노출). 앱마다 다른 아이콘이라 꼭 넘긴다 */
  appIcon: ReactNode;
  /** 피그마 Title(WindowTitle에서 노출). 창 제목 글자다 */
  title?: string;
  /** custom 제목 표시줄에서만 쓴다 */
  titleBarContent?: never;
};

type WindowFrameCustomTitleBarProps = WindowFrameCommonProps & {
  /** 피그마 Title bar=Custom */
  titleBar: 'custom';
  /** 피그마 `Title bar content` 슬롯. 탭이나 주소창처럼 앱이 제목 표시줄을 채운다 */
  titleBarContent?: ReactNode;
  /** default 제목 표시줄에서만 쓴다 */
  appIcon?: never;
  /** default 제목 표시줄에서만 쓴다 */
  title?: never;
};

type WindowFrameProps = WindowFrameDefaultTitleBarProps | WindowFrameCustomTitleBarProps;

// 재질별 바탕 칠(피그마 칠 스타일)이다. 마이카 바탕은 반투명 색과 배경 흐림을 함께 건다.
const materialClassNames = {
  mica: 'material-mica-base',
  solid: 'bg-material-fallback-mica-base',
  chrome: 'bg-chrome-frame-fill',
} as const satisfies Record<WindowFrameMaterial, string>;

// 떠 있는 창(Placement=Normal)의 효과 스타일이다. 마이카는 그림자와 배경 흐림을 함께 거는 Surface 스타일을 쓴다.
const activeShadowClassNames = {
  mica: 'surface-window-active-mica',
  solid: 'shadow-elevation-window-active',
  chrome: 'shadow-elevation-window-active',
} as const satisfies Record<WindowFrameMaterial, string>;

const inactiveShadowClassNames = {
  mica: 'surface-window-inactive-mica',
  solid: 'shadow-elevation-window-inactive',
  chrome: 'shadow-elevation-window-inactive',
} as const satisfies Record<WindowFrameMaterial, string>;

/**
 * 앱 창의 틀(피그마 WindowFrame)을 그린다. 제목 표시줄(WindowTitle 또는 앱이 채우는 자리)과 CaptionButtonGroup,
 * 내용 자리(children, 피그마 Content 슬롯)로 이뤄진다. 창 크기는 쓰는 곳이 className으로 정한다.
 * 떠 있는 창의 테두리는 피그마에서 레이아웃에 들어가므로(strokes included in layout) CSS border를 쓴다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 기반:재질 효과]]
 * @param props
 */
export function WindowFrame(props: WindowFrameProps): JSX.Element {
  const {
    titleBar = 'default',
    appIcon,
    title,
    titleBarContent,
    inactive: isInactive = false,
    placement = 'normal',
    material = 'mica',
    onMinimize: handleMinimize,
    onMaximize: handleMaximize,
    onRestore: handleRestore,
    onClose: handleClose,
    className,
    children,
    ...divProps
  } = props;
  const isFloating = placement === 'normal';
  const isCustom = titleBar === 'custom';
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col overflow-clip',
        materialClassNames[material],
        isFloating && [
          'rounded-overlay border-default border-surface-stroke-default',
          (isInactive ? inactiveShadowClassNames : activeShadowClassNames)[material],
        ],
        className,
      )}
    >
      <div
        className={cn('flex w-full shrink-0 items-start overflow-clip', isCustom ? 'h-40' : 'h-32')}
      >
        {isCustom ? (
          <div className="flex min-w-px flex-1 items-end self-stretch overflow-clip px-8 pt-8">
            {titleBarContent}
          </div>
        ) : (
          <WindowTitle
            appIcon={appIcon}
            title={title}
            inactive={isInactive}
            className="min-w-px flex-1"
          />
        )}
        <CaptionButtonGroup
          placement={placement}
          inactive={isInactive}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onRestore={handleRestore}
          onClose={handleClose}
          className="shrink-0"
        />
      </div>
      <div className="flex min-h-px w-full flex-1 flex-col items-center justify-center overflow-clip">
        {children}
      </div>
    </div>
  );
}
