import type { JSX, ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { usePresence } from '@/shared/presence/use-presence';
import type { Device } from '@/shared/viewport/use-device';

import { getTaskbarOffset } from './window-geometry';
import type { OpenWindow, WindowPlacement } from './window-rules';
import { useWindowStore } from './window-store';

/** 창 층이 앱 창(`ExplorerWindow`, `ChromeWindow`)의 WindowFrame에 넘기는 속성 */
export type WindowFrameControls = {
  /** 맨 앞 창이 아니면 흐리게 그린다 */
  inactive: boolean;
  /** 창 배치. 모바일은 늘 maximized다 */
  placement: WindowPlacement;
  /** 최소화 버튼을 눌렀을 때 */
  onMinimize: () => void;
  /** 닫기 버튼을 눌렀을 때 */
  onClose: () => void;
  /** 창 자리를 채우는 크기 클래스 */
  className: string;
};

/** 열린 창 하나를 그리는 함수. 앱마다 다른 창 조립은 쓰는 곳(`features/desktop`)이 고른다 */
export type RenderWindow = (window: OpenWindow, controls: WindowFrameControls) => ReactNode;

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
  /** 앱 창을 그린다 */
  renderWindow: RenderWindow;
  /** 닫히는 애니메이션이 끝났을 때 부른다. 창 층이 남겨 둔 창을 놓는다 */
  onExitComplete: (id: string) => void;
};

// 작업 표시줄 앱 버튼까지의 거리를 넘기는 CSS 변수(motion.css의 실행 중 값)다.
const TASKBAR_OFFSET_X = '--motion-window-taskbar-offset-x';
const TASKBAR_OFFSET_Y = '--motion-window-taskbar-offset-y';

/**
 * 열린 창 하나를 작업 영역 위 제자리에 그리고, 열기·닫기·최소화·복원 모션 클래스를 붙인다.
 * - 열림과 최소화를 presence 하나로 다룬다. 처음 나타날 때 `motion-window-open`, 최소화에서 돌아올 때 `motion-window-restore`,
 *   닫힐 때 `motion-window-close`, 최소화할 때 `motion-window-minimize`다.
 * - 최소화한 창은 빼지 않고 `hidden`·`inert`로 숨겨 창 안의 상태와 스크롤을 지킨다.
 * - 최소화·복원이 향하는 작업 표시줄 앱 버튼(`[data-taskbar-app]`)까지의 거리를 CSS 변수로 넘긴다.
 * - 창을 누르면 맨 앞으로 가져오고, 맨 앞이 아닌 창은 흐리게 그린다.
 * 위치는 실행 중 값이라 인라인 left·top·width·height로 주고 `transform`은 쓰지 않는다(모션 클래스의 translate·scale과 겹치지 않게).
 * @codocs [[창 동작:창 조작]]
 * @codocs [[디자인 기반:모션 클래스]]
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
    renderWindow,
    onExitComplete,
  } = props;
  const { id, app, isMinimized } = target;
  const { x, y, width, height } = target.bounds;
  const isMobile = device === 'mobile';
  const ref = useRef<HTMLDivElement>(null);
  const focus = useWindowStore((state) => state.focus);
  const minimize = useWindowStore((state) => state.minimize);
  const close = useWindowStore((state) => state.close);

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
      {renderWindow(target, {
        inactive: !isActive,
        placement: isMobile ? 'maximized' : target.placement,
        onMinimize: handleMinimize,
        onClose: handleClose,
        className: 'size-full',
      })}
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
