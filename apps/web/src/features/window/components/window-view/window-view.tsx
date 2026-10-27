import type { JSX } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { SnapLayoutMenu } from '@/features/window/components/snap-layout-menu/snap-layout-menu';
import { useWindowSnapMotion } from '@/features/window/hooks/use-window-snap-motion/use-window-snap-motion';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { getTaskbarOffset } from '@/shared/utils/window-geometry/window-geometry';
import type {
  OpenWindow,
  RenderWindow,
  SnapLayout,
  SnapZone,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import { getWindowRect } from '@/shared/utils/window-rules/window-rules';

type WindowViewProps = {
  /** 그릴 창. 닫힌 창은 저장소에서 지우기 직전의 모습이다 */
  window: OpenWindow;
  /** 창 제목. 창 영역의 접근성 이름이 된다 */
  title: string;
  /** 저장소에서 지워져 닫히는 애니메이션만 남은 창인지 */
  closing: boolean;
  /** 맨 앞 창인지 */
  active: boolean;
  /** 쌓는 차례. 클수록 위다 */
  zIndex: number;
  /** 화면 방식. 모바일은 창이 늘 작업 영역을 채운다 */
  device: Device;
  /** 작업 영역 크기. 최대화·스냅한 창의 자리를 구한다. 마운트 전에는 null이다 */
  workArea: WindowWorkArea | null;
  /** 앱 창을 그린다 */
  renderWindow: RenderWindow;
  /** 닫히는 애니메이션이 끝났을 때 부른다. 창 층이 남겨 둔 창을 놓는다 */
  onExitComplete: (id: string) => void;
  /** 스냅 레이아웃에서 칸을 골라 스냅했을 때 부른다. 창 층이 남은 칸에 Snap Assist를 띄운다 */
  onSnap: (id: string, zone: SnapZone) => void;
};

// 작업 표시줄 앱 버튼까지의 거리를 넘기는 CSS 변수(motion.css의 실행 중 값)다.
const TASKBAR_OFFSET_X = '--motion-window-taskbar-offset-x';
const TASKBAR_OFFSET_Y = '--motion-window-taskbar-offset-y';

/**
 * 열린 창 하나를 작업 영역 위 제자리에 그리고, 열기·닫기·최소화·복원·최대화·스냅 모션 클래스를 붙인다.
 * - 열림과 최소화를 presence 하나로 다룬다. 처음 나타날 때 `motion-window-open`, 최소화에서 돌아올 때 `motion-window-restore`,
 *   닫힐 때 `motion-window-close`, 최소화할 때 `motion-window-minimize`다.
 * - 최소화한 창은 빼지 않고 `hidden`·`inert`로 숨겨 창 안의 상태와 스크롤을 지킨다.
 * - 최소화·복원이 향하는 작업 표시줄 앱 버튼(`[data-taskbar-app]`)까지의 거리를 CSS 변수로 넘긴다.
 * - 창을 누르면 맨 앞으로 가져오고, 맨 앞이 아닌 창은 흐리게 그린다.
 * - 최대화 버튼·이전 크기로 복원 버튼·제목 표시줄 더블클릭으로 최대화하고 복원한다. 최대화 버튼에 마우스를 올리면 스냅 레이아웃을 연다.
 * - 최대화·복원·스냅으로 자리가 바뀌면 안쪽 요소에서 `motion-window-snap`을 FLIP으로 재생한다(`useWindowSnapMotion`).
 * 위치는 실행 중 값이라 인라인 left·top·width·height로 주고 `transform`은 쓰지 않는다(모션 클래스의 translate·scale과 겹치지 않게).
 * @codocs [[창 동작:창 조작]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @codocs [[창 동작:스냅]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function WindowView(props: WindowViewProps): JSX.Element {
  const {
    window: target,
    title,
    closing: isClosing,
    active: isActive,
    zIndex,
    device,
    workArea,
    renderWindow,
    onExitComplete,
    onSnap,
  } = props;
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

  useWindowSnapMotion(
    snapRef,
    rect,
    `${target.placement}:${target.snapZone?.layout ?? ''}:${String(target.snapZone?.index ?? '')}`,
    !isMobile && interaction === null,
  );

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
    keepMounted: true,
    onExitComplete: isClosing
      ? () => {
          onExitComplete(id);
        }
      : undefined,
  });

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
      data-window-state={isActive ? 'active' : 'inactive'}
      hidden={presence.isHidden}
      inert={presence.isHidden || isClosing}
      onPointerDown={handlePointerDown}
      {...presence.presenceProps}
      className={[
        'pointer-events-auto absolute flex',
        isMobile && 'inset-0',
        getMotionClassName(presence.status, isClosing, isRestoring),
      ]
        .filter(Boolean)
        .join(' ')}
      style={isMobile ? { zIndex } : { zIndex, left: x, top: y, width, height }}
    >
      {/* 최대화·스냅 FLIP 전용 요소. 모션 클래스는 classList로만 붙여 바깥의 열기·최소화 클래스와 겹치지 않는다 */}
      <div ref={snapRef} className="absolute inset-0 flex">
        {renderWindow(
          target,
          isMobile
            ? {
                inactive: !isActive,
                placement: 'maximized',
                onMinimize: handleMinimize,
                onClose: handleClose,
                className: 'size-full',
              }
            : {
                inactive: !isActive,
                placement: target.placement,
                onMinimize: handleMinimize,
                onClose: handleClose,
                onMaximize: handleMaximize,
                onRestore: handleRestore,
                onTitleBarDoubleClick: handleTitleBarDoubleClick,
                maximizeSlot: (
                  <SnapLayoutMenu
                    inactive={!isActive}
                    onMaximize={handleMaximize}
                    onSelectZone={handleSelectZone}
                  />
                ),
                className: 'size-full',
              },
        )}
      </div>
    </div>
  );
}

/**
 * 지금 단계에 맞는 창 모션 클래스를 고른다. 동작 줄이기 규칙이 글자 그대로의 클래스에만 걸리므로 변형 클래스를 쓰지 않는다.
 * 최소화가 끝난 뒤(exited)에도 최소화 클래스를 두어 끝 모습(투명도 0)을 붙든다. 숨김은 `hidden`이 맡는다.
 * @codocs [[디자인 기반:모션]]
 * @param status presence 단계
 * @param isClosing 닫히는 창인지
 * @param isRestoring 최소화에서 돌아오는 창인지
 * @returns 모션 클래스
 */
function getMotionClassName(
  status: ReturnType<typeof usePresence>['status'],
  isClosing: boolean,
  isRestoring: boolean,
): string {
  if (status === 'exiting' || status === 'exited') {
    return isClosing ? 'motion-window-close' : 'motion-window-minimize';
  }
  return isRestoring ? 'motion-window-restore' : 'motion-window-open';
}
