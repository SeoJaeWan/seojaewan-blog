import type { JSX, PointerEvent } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@seojaewan/design-system';

import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type {
  DragSnapTarget,
  ResizeDirection,
} from '@/shared/utils/window-drag-rules/window-drag-rules';
import { getTaskbarOffset } from '@/shared/utils/window-geometry/window-geometry';
import type {
  OpenWindow,
  RenderWindow,
  SnapLayout,
  SnapZone,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import { getWindowRect } from '@/shared/utils/window-rules/window-rules';

import { SnapLayoutMenu } from './components/snap-layout-menu/snap-layout-menu';
import { useWindowDrag } from './hooks/use-window-drag/use-window-drag';
import { useWindowSnapMotion } from './hooks/use-window-snap-motion/use-window-snap-motion';

type WindowViewProps = {
  window: OpenWindow;
  title: string;
  isClosing: boolean;
  isActive: boolean;
  isEntry?: boolean;
  zIndex: number;
  device: DeviceVariant;
  workArea: WindowWorkArea | null;
  renderWindow: RenderWindow;
  onExitComplete: (id: string) => void;
  onSnap: (id: string, zone: SnapZone) => void;
  onSnapPreviewChange: (id: string, target: DragSnapTarget | null) => void;
};

// 작업 표시줄 앱 버튼까지의 거리를 넘기는 CSS 변수(motion.css의 실행 중 값)다.
const TASKBAR_OFFSET_X = '--motion-window-taskbar-offset-x';
const TASKBAR_OFFSET_Y = '--motion-window-taskbar-offset-y';

// 크기 조절 핸들. 가장자리는 창 밖 8px 띠, 모서리는 창 모서리에 걸친 16px 칸이다(창 안으로 8px 들어온다).
const resizeHandleClassNames = {
  n: 'inset-x-spacing-sm -top-spacing-sm h-size-window-resize-edge cursor-ns-resize',
  s: 'inset-x-spacing-sm -bottom-spacing-sm h-size-window-resize-edge cursor-ns-resize',
  w: 'inset-y-spacing-sm -left-spacing-sm w-size-window-resize-edge cursor-ew-resize',
  e: 'inset-y-spacing-sm -right-spacing-sm w-size-window-resize-edge cursor-ew-resize',
  nw: '-top-spacing-sm -left-spacing-sm size-size-window-resize-corner cursor-nwse-resize',
  ne: '-top-spacing-sm -right-spacing-sm size-size-window-resize-corner cursor-nesw-resize',
  sw: '-bottom-spacing-sm -left-spacing-sm size-size-window-resize-corner cursor-nesw-resize',
  se: '-right-spacing-sm -bottom-spacing-sm size-size-window-resize-corner cursor-nwse-resize',
} as const satisfies Record<ResizeDirection, string>;

const RESIZE_DIRECTIONS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'] as const;

/** 바깥 요소에서 재생하는 창 모션 */
type WindowMotion = 'open' | 'restore' | 'minimize' | 'close';

// 동작 줄이기 규칙이 글자 그대로의 클래스에만 걸리므로 변형 클래스를 쓰지 않는다.
const windowMotionClassNames: Readonly<Record<WindowMotion, string>> = {
  open: 'motion-window-open',
  restore: 'motion-window-restore',
  minimize: 'motion-window-minimize',
  close: 'motion-window-close',
};

/**
 * 열린 창 하나를 작업 영역 위 제자리에 그리고, 열기·닫기·최소화·복원·최대화·스냅 모션 클래스를 붙인다.
 * - 열림과 최소화를 presence 하나로 다룬다. 처음 나타날 때 `motion-window-open`, 최소화에서 돌아올 때 `motion-window-restore`,
 *   닫힐 때 `motion-window-close`, 최소화할 때 `motion-window-minimize`다.
 * - 최소화한 창은 빼지 않고 `hidden`·`inert`로 숨겨 창 안의 상태와 스크롤을 지킨다.
 * - 최소화·복원이 향하는 작업 표시줄 앱 버튼(`[data-taskbar-app]`)까지의 거리를 CSS 변수로 넘긴다.
 * - 창을 누르면 맨 앞으로 가져오고, 맨 앞이 아닌 창은 흐리게 그린다.
 * - 최대화 버튼·이전 크기로 복원 버튼·제목 표시줄 더블클릭으로 최대화하고 복원한다. 최대화 버튼에 마우스를 올리면 스냅 레이아웃을 연다.
 * - 최대화·복원·스냅으로 자리가 바뀌면 안쪽 요소에서 `motion-window-snap`을 FLIP으로 재생한다(`useWindowSnapMotion`).
 * - 제목 표시줄을 끌어 옮기고, 떠 있는 창은 가장자리·모서리 핸들로 크기를 조절한다(`useWindowDrag`). 끝으로 끌어 놓으면 스냅·최대화한다.
 *   최대화·스냅한 창은 크기를 조절하지 않는다. 모바일 창은 늘 전체화면이라 끌기·크기 조절이 없다.
 * 위치는 실행 중 값이라 인라인 left·top·width·height로 주고 `transform`은 쓰지 않는다(모션 클래스의 translate·scale과 겹치지 않게).
 * 서버가 그린 첫 진입 창(`isEntry`)은 아직 숫자 자리가 없어 `data-window-entry`를 달고 CSS(`globals.css`)가 기본 크기·가운데(모바일은
 * 전체화면)에 놓는다. 저장소에 같은 창이 열리면 같은 요소에 숫자 자리가 들어간다. 그동안은 끌거나 크기를 조절하지 않는다.
 * @codocs [[창 동작:창 조작]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @codocs [[스냅:스냅된 창]]
 * @codocs [[창 동작:모바일]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param props 컴포넌트 속성
 * @param props.window 그릴 창. 닫힌 창은 저장소에서 지우기 직전의 모습이다
 * @param props.title 창 제목. 창 영역의 접근성 이름이 된다
 * @param props.isClosing 저장소에서 지워져 닫히는 애니메이션만 남은 창인지
 * @param props.isActive 맨 앞 창인지
 * @param props.isEntry 서버가 그린 첫 진입 창이라 저장소에 아직 없는지. CSS가 자리를 정한다
 * @param props.zIndex 쌓는 차례. 클수록 위다
 * @param props.device 화면 방식. 모바일은 창이 늘 작업 영역을 채운다
 * @param props.workArea 작업 영역 크기. 최대화·스냅한 창의 자리를 구한다. 마운트 전에는 null이다
 * @param props.renderWindow 앱 창을 그린다
 * @param props.onExitComplete 닫히는 애니메이션이 끝났을 때 부른다. 창 층이 남겨 둔 창을 놓는다
 * @param props.onSnap 스냅 레이아웃에서 칸을 골라 스냅했을 때 부른다. 창 층이 남은 칸에 Snap Assist를 띄운다
 * @param props.onSnapPreviewChange 끄는 동안 놓으면 채울 곳이 바뀌었을 때 부른다. 창 층이 그 자리에 SnapPreview를 그린다
 */
export function WindowView({
  window: target,
  title,
  isClosing,
  isActive,
  isEntry = false,
  zIndex,
  device,
  workArea,
  renderWindow,
  onExitComplete,
  onSnap,
  onSnapPreviewChange,
}: WindowViewProps): JSX.Element {
  const { id, app, isMinimized } = target;
  const rect = workArea === null ? target.bounds : getWindowRect(target, workArea);
  const { x, y, width, height } = rect;
  const isMobile = device === 'mobile';
  const ref = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const focus = useWindowStore((state) => state.focus);
  const minimize = useWindowStore((state) => state.minimize);
  const close = useWindowStore((state) => state.close);
  const maximize = useWindowStore((state) => state.maximize);
  const restoreFromMaximize = useWindowStore((state) => state.restoreFromMaximize);
  const toggleMaximize = useWindowStore((state) => state.toggleMaximize);
  const snap = useWindowStore((state) => state.snap);
  const interaction = useWindowStore((state) => state.interaction);

  const rememberSnapRect = useWindowSnapMotion(
    snapRef,
    rect,
    `${target.placement}:${target.snapZone?.layout ?? ''}:${String(target.snapZone?.index ?? '')}`,
    !isMobile && interaction === null,
  );

  const { handleTitleBarPointerDown, handleResizePointerDown } = useWindowDrag({
    elementRef: ref,
    window: target,
    rect,
    workArea,
    isEnabled: !isMobile && !isClosing && !isMinimized && !isEntry,
    onSnapPreviewChange: (snapTarget) => {
      onSnapPreviewChange(id, snapTarget);
    },
    onDragSnap: (zone) => {
      onSnap(id, zone);
    },
    rememberSnapRect,
  });
  const isResizable = !isMobile && !isClosing && !isEntry && target.placement === 'default';

  // 최소화에서 돌아오는 것인지 기억한다. 처음 나타날 때만 열기 모션이다.
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPreviousMinimized, setIsPreviousMinimized] = useState(isMinimized);
  if (isMinimized !== isPreviousMinimized) {
    setIsPreviousMinimized(isMinimized);
    if (!isMinimized) {
      setIsRestoring(true);
    }
  }

  useLayoutEffect(
    /** 창 중심에서 작업 표시줄 앱 버튼 중심까지의 거리를 재서 넘긴다. 숨긴 창은 잴 수 없어 저장소의 자리로 구한다. */
    () => {
      const element = ref.current;
      const layer = element?.parentElement;
      const button = document.querySelector(`[data-taskbar-app="${app}"]`);
      if (element === null || layer === null || layer === undefined || button === null) {
        return;
      }
      const layerRect = layer.getBoundingClientRect();
      const windowRect = isMobile
        ? layerRect
        : { left: layerRect.left + x, top: layerRect.top + y, width, height };
      const offset = getTaskbarOffset(windowRect, button.getBoundingClientRect());
      element.style.setProperty(TASKBAR_OFFSET_X, `${String(offset.x)}px`);
      element.style.setProperty(TASKBAR_OFFSET_Y, `${String(offset.y)}px`);
    },
    [app, isMobile, x, y, width, height, isMinimized],
  );

  const presence = usePresence(ref, !isClosing && !isMinimized, {
    shouldKeepMounted: true,
    onExitComplete: isClosing
      ? () => {
          onExitComplete(id);
        }
      : undefined,
  });
  const motion = getWindowMotion(presence.status, isClosing, isRestoring);

  /** 창을 누르면 맨 앞으로 가져온다. */
  function handlePointerDown(): void {
    if (!isActive && !isClosing) {
      focus(id);
    }
  }

  /** 최소화 버튼을 누르면 창을 최소화한다. */
  function handleMinimize(): void {
    minimize(id);
  }

  /** 닫기 버튼을 누르면 창을 저장소에서 바로 지운다. 화면에서는 닫히는 애니메이션이 끝날 때까지 남는다. */
  function handleClose(): void {
    close(id);
  }

  /** 최대화 버튼을 누르면 창을 최대화한다. */
  function handleMaximize(): void {
    maximize(id);
  }

  /** 이전 크기로 복원 버튼을 누르면 최대화하기 바로 앞 모습으로 돌아간다. */
  function handleRestore(): void {
    restoreFromMaximize(id);
  }

  /** 제목 표시줄을 더블클릭하면 최대화하거나 복원한다. */
  function handleTitleBarDoubleClick(): void {
    toggleMaximize(id);
  }

  /**
   * 스냅 레이아웃에서 칸을 고르면 창을 그 칸에 맞추고 창 층에 알린다.
   * @param layout 레이아웃
   * @param index 칸 번호
   */
  function handleSelectZone(layout: SnapLayout, index: number): void {
    const zone = { layout, index };
    snap(id, zone);
    onSnap(id, zone);
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={title}
      // 창 층이 포커스를 옮길 때 찾는다. 제목 표시줄을 눌러도 포커스가 창 안에 남도록 영역도 포커스를 받는다.
      tabIndex={-1}
      data-window-id={id}
      data-window-state={isActive ? 'active' : 'inactive'}
      data-window-motion={motion}
      data-window-entry={isEntry ? app : undefined}
      hidden={presence.isHidden}
      inert={presence.isHidden || isClosing}
      onPointerDown={handlePointerDown}
      {...presence.presenceProps}
      className={cn(
        'pointer-events-auto absolute flex outline-none',
        isMobile && 'inset-spacing-none',
        windowMotionClassNames[motion],
      )}
      style={isMobile || isEntry ? { zIndex } : { zIndex, left: x, top: y, width, height }}
    >
      {/* 최대화·스냅 FLIP 전용 요소. 모션 클래스는 classList로만 붙여 바깥의 열기·최소화 클래스와 겹치지 않는다.
          앱 창은 이 자리를 채운다 */}
      <div ref={snapRef} className="absolute inset-spacing-none flex [&>*]:size-full">
        {renderWindow(
          target,
          isMobile
            ? {
                isInactive: !isActive,
                placement: 'maximized',
                onMinimize: handleMinimize,
                onClose: handleClose,
              }
            : {
                isInactive: !isActive,
                placement: target.placement,
                onMinimize: handleMinimize,
                onClose: handleClose,
                onMaximize: handleMaximize,
                onRestore: handleRestore,
                onTitleBarDoubleClick: handleTitleBarDoubleClick,
                onTitleBarPointerDown: handleTitleBarPointerDown,
                maximizeSlot: (
                  <SnapLayoutMenu
                    isInactive={!isActive}
                    onMaximize={handleMaximize}
                    onSelectZone={handleSelectZone}
                  />
                ),
              },
        )}
      </div>
      {isResizable &&
        RESIZE_DIRECTIONS.map(
          /**
           * 크기 조절 핸들 하나를 그린다.
           * @param direction 방향
           * @returns ResizeHandle
           */
          (direction) => (
            <ResizeHandle
              key={direction}
              direction={direction}
              className={resizeHandleClassNames[direction]}
              onResizeStart={handleResizePointerDown}
            />
          ),
        )}
    </div>
  );
}

type ResizeHandleProps = {
  direction: ResizeDirection;
  className: string;
  onResizeStart: (direction: ResizeDirection, event: PointerEvent<HTMLDivElement>) => void;
};

/**
 * 창 크기 조절 핸들 하나를 그린다. 마우스·펜으로만 쓰는 자리라 접근성 트리에서 뺀다.
 * @codocs [[창 동작:창 조작]]
 * @param props 컴포넌트 속성
 * @param props.direction 핸들 방향
 * @param props.className 자리와 커서 클래스
 * @param props.onResizeStart 핸들을 눌렀을 때. 그 방향으로 크기 조절을 시작한다
 */
function ResizeHandle({ direction, className, onResizeStart }: ResizeHandleProps): JSX.Element {
  /**
   * 누르면 이 방향으로 크기 조절을 시작한다.
   * @param event 누르기 이벤트
   */
  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    onResizeStart(direction, event);
  }
  return (
    <div
      aria-hidden
      data-resize-handle={direction}
      onPointerDown={handlePointerDown}
      className={`absolute ${className}`}
    />
  );
}

/**
 * 지금 단계에 맞는 창 모션을 고른다. 모션 클래스와 `data-window-motion`이 이 값을 따른다.
 * 최소화가 끝난 뒤(exited)에도 최소화 클래스를 두어 끝 모습(투명도 0)을 붙든다. 숨김은 `hidden`이 맡는다.
 * @codocs [[디자인 기반:모션]]
 * @param status presence 단계
 * @param isClosing 닫히는 창인지
 * @param isRestoring 최소화에서 돌아오는 창인지
 * @returns 창 모션
 */
function getWindowMotion(
  status: ReturnType<typeof usePresence>['status'],
  isClosing: boolean,
  isRestoring: boolean,
): WindowMotion {
  if (status === 'exiting' || status === 'exited') {
    return isClosing ? 'close' : 'minimize';
  }
  return isRestoring ? 'restore' : 'open';
}
