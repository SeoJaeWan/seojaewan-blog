import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type {
  DragSnapTarget,
  ResizeDirection,
  WindowPoint,
} from '@/shared/utils/window-drag-rules/window-drag-rules';
import {
  getDetachedBounds,
  getDragSnapTarget,
  hasPassedDragThreshold,
  isSameDragSnapTarget,
  moveWindowBounds,
  resizeWindowBounds,
} from '@/shared/utils/window-drag-rules/window-drag-rules';
import type {
  OpenWindow,
  SnapZone,
  WindowBounds,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import { MIN_WINDOW_SIZES } from '@/shared/utils/window-rules/window-rules';

type UseWindowDragOptions = {
  /** 작업 영역 위에 놓인 창 요소. 끄는 동안 이 요소의 left·top·width·height를 바로 바꾼다 */
  elementRef: RefObject<HTMLElement | null>;
  /** 끌 창 */
  window: OpenWindow;
  /** 창이 지금 화면에서 차지하는 자리 */
  rect: WindowBounds;
  /** 작업 영역 크기. 마운트 전에는 null이다 */
  workArea: WindowWorkArea | null;
  /** 끌기·크기 조절을 받을지. 모바일 창, 닫히는 창은 받지 않는다 */
  isEnabled: boolean;
  /** 끄는 동안 놓으면 채울 곳이 바뀌었을 때 부른다. 끝 근처를 벗어나거나 끌기가 끝나면 null이다 */
  onSnapPreviewChange: (target: DragSnapTarget | null) => void;
  /** 끌어서 스냅 칸에 놓았을 때 부른다. 창 층이 남은 칸에 Snap Assist를 띄운다 */
  onDragSnap: (zone: SnapZone) => void;
  /** 끌어서 스냅·최대화할 때 끌던 자리를 최대화·스냅 FLIP의 이전 자리로 넘긴다 */
  rememberSnapRect: (rect: WindowBounds) => void;
};

/** 창 끌기와 크기 조절을 시작하는 핸들러 */
type WindowDragHandlers = {
  /** 제목 표시줄을 눌렀을 때. 끌어 옮기기를 시작한다 */
  handleTitleBarPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  /** 크기 조절 핸들을 눌렀을 때. 그 방향으로 크기 조절을 시작한다 */
  handleResizePointerDown: (
    direction: ResizeDirection,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
};

/** 누른 포인터 하나를 따라가는 데 필요한 것 */
type PointerSession = {
  /** 창 요소 */
  element: HTMLElement;
  /** 작업 영역 크기 */
  workArea: WindowWorkArea;
  /** 누른 자리(작업 영역 기준) */
  grab: WindowPoint;
  /** 포인터를 따라가기 시작한다 */
  track: (onMove: (point: WindowPoint) => void, onEnd: (point: WindowPoint | null) => void) => void;
};

/**
 * 창을 제목 표시줄로 끌어 옮기고, 가장자리·모서리 핸들로 크기를 조절한다. 마우스 왼쪽 버튼과 펜만 받는다.
 * - 끄는 동안의 자리는 저장소에 두지 않고 창 요소의 인라인 스타일에 바로 그린다. 창 전체를 다시 그리지 않기 위해서다.
 *   놓을 때 저장소에 반영하고(`setBounds`·`snap`·`maximize`), 그 직전에 요소를 마지막으로 그린 자리로 돌려 React가 바뀐 값을 빠짐없이 쓰게 한다.
 * - 끄는 동안 저장소의 `interaction`을 두어 최대화·스냅 모션을 끈다.
 * - 제목 표시줄은 끌기 거리를 넘게 움직여야 끌기를 시작한다. 최대화·스냅한 창은 그때 떠 있을 때 크기로 떼어 포인터 아래에 놓는다.
 * - 끄는 도중 창이 사라지거나(닫힘, 창 층 언마운트) 끌기를 받지 않게 되면 진행 중인 끌기를 취소해 `interaction`과 미리 보기를 남기지 않는다.
 * - 포인터가 작업 영역 왼쪽·오른쪽·위쪽 끝에 닿으면 채울 곳을 알리고, 거기서 놓으면 스냅하거나 최대화한다.
 *   스냅 FLIP은 끌던 자리에서 이어진다. 놓을 때 창의 떠 있을 때 자리(`bounds`)는 끌기 전 그대로다.
 * @codocs [[창 동작:창 조작]]
 * @codocs [[창 동작:스냅]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param options 창과 알릴 곳
 * @returns 제목 표시줄과 크기 조절 핸들의 누르기 핸들러
 */
export function useWindowDrag(options: UseWindowDragOptions): WindowDragHandlers {
  const {
    elementRef,
    window: target,
    rect,
    workArea,
    isEnabled,
    onSnapPreviewChange,
    onDragSnap,
    rememberSnapRect,
  } = options;
  const setInteraction = useWindowStore((state) => state.setInteraction);
  const setBounds = useWindowStore((state) => state.setBounds);
  const detach = useWindowStore((state) => state.detach);
  const snap = useWindowStore((state) => state.snap);
  const maximize = useWindowStore((state) => state.maximize);
  const renderedRectRef = useRef(rect);
  const cancelRef = useRef<(() => void) | null>(null);

  useLayoutEffect(
    /** React가 창 요소에 마지막으로 그린 자리를 기억한다. 놓을 때 요소를 이 자리로 돌린다. */
    () => {
      renderedRectRef.current = rect;
    },
  );

  useEffect(
    /**
     * 창이 사라지거나 끌기를 받지 않게 되면 진행 중인 끌기를 취소한다.
     * @returns 취소하는 정리 함수
     */
    () => {
      return () => {
        cancelRef.current?.();
      };
    },
    [isEnabled],
  );

  /**
   * 누르기를 받을 수 있으면 포인터를 붙잡고 따라갈 준비를 한다.
   * @param event 누르기 이벤트
   * @returns 따라갈 준비. 받지 않는 누르기면 null
   */
  function beginPointer(event: ReactPointerEvent<HTMLElement>): PointerSession | null {
    const element = elementRef.current;
    const layer = element?.parentElement;
    const isPrimary =
      event.button === 0 && (event.pointerType === 'mouse' || event.pointerType === 'pen');
    if (!isEnabled || !isPrimary || workArea === null || element === null || !layer) {
      return null;
    }
    // 글자 선택과 끌기(drag and drop)가 함께 시작되지 않게 한다. 클릭·더블클릭은 그대로 일어난다.
    event.preventDefault();
    const handle = event.currentTarget;
    const { pointerId } = event;
    const origin = layer.getBoundingClientRect();
    /**
     * 화면 좌표를 작업 영역 좌표로 바꾼다.
     * @param pointer 포인터 이벤트
     * @param pointer.clientX 화면 가로 좌표
     * @param pointer.clientY 화면 세로 좌표
     * @returns 작업 영역 위 자리
     */
    function toPoint(pointer: { clientX: number; clientY: number }): WindowPoint {
      return { x: pointer.clientX - origin.left, y: pointer.clientY - origin.top };
    }
    return {
      element,
      workArea,
      grab: toPoint(event),
      track: (onMove, onEnd) => {
        cancelRef.current = trackPointer(handle, pointerId, toPoint, onMove, (point) => {
          cancelRef.current = null;
          onEnd(point);
        });
      },
    };
  }

  /**
   * 제목 표시줄을 누르면 끌어 옮기기를 시작한다.
   * @param event 누르기 이벤트
   */
  function handleTitleBarPointerDown(event: ReactPointerEvent<HTMLElement>): void {
    const session = beginPointer(event);
    if (session === null) {
      return;
    }
    const { element, workArea: area, grab } = session;
    const { id } = target;
    const startRect = rect;
    const startPlacement = target.placement;
    const floatingSize = { width: target.bounds.width, height: target.bounds.height };
    let base: { bounds: WindowBounds; pointer: WindowPoint } | null = null;
    let current = startRect;
    let snapTarget: DragSnapTarget | null = null;
    session.track(
      /**
       * 포인터를 따라 창을 옮기고 놓으면 채울 곳을 알린다. 최대화·스냅한 창은 끌기를 시작할 때 떼어 낸다.
       * @param point 포인터 자리
       */
      (point) => {
        if (base === null) {
          if (!hasPassedDragThreshold(grab, point)) {
            return;
          }
          setInteraction('drag');
          if (startPlacement === 'normal') {
            base = { bounds: startRect, pointer: grab };
          } else {
            const detached = getDetachedBounds(startRect, floatingSize, grab, point, area);
            detach(id, detached);
            base = { bounds: detached, pointer: point };
          }
        }
        current = moveWindowBounds(
          base.bounds,
          { x: point.x - base.pointer.x, y: point.y - base.pointer.y },
          area,
        );
        writeBounds(element, current);
        const nextTarget = getDragSnapTarget(point, area);
        if (!isSameDragSnapTarget(nextTarget, snapTarget)) {
          snapTarget = nextTarget;
          onSnapPreviewChange(nextTarget);
        }
      },
      /**
       * 놓으면 끌던 자리를 저장소에 반영하거나, 끝 근처면 스냅·최대화한다. 취소되면 마지막으로 그린 자리로 돌아간다.
       * @param point 놓은 자리. 취소되면 null
       */
      (point) => {
        if (base === null) {
          return;
        }
        writeBounds(element, renderedRectRef.current);
        if (snapTarget !== null) {
          onSnapPreviewChange(null);
        }
        if (point !== null && snapTarget !== null) {
          rememberSnapRect(current);
          if (snapTarget.type === 'maximize') {
            maximize(id);
          } else {
            snap(id, snapTarget.zone);
            onDragSnap(snapTarget.zone);
          }
        } else if (point !== null) {
          setBounds(id, current);
        }
        setInteraction(null);
      },
    );
  }

  /**
   * 크기 조절 핸들을 누르면 그 방향으로 크기 조절을 시작한다.
   * @param direction 핸들 방향
   * @param event 누르기 이벤트
   */
  function handleResizePointerDown(
    direction: ResizeDirection,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    const session = beginPointer(event);
    if (session === null) {
      return;
    }
    const { element, workArea: area, grab } = session;
    const { id } = target;
    const startRect = rect;
    const minSize = MIN_WINDOW_SIZES[target.app];
    let isStarted = false;
    let current = startRect;
    session.track(
      /**
       * 포인터를 따라 끄는 쪽 가장자리를 옮긴다.
       * @param point 포인터 자리
       */
      (point) => {
        if (!isStarted) {
          isStarted = true;
          setInteraction('resize');
        }
        current = resizeWindowBounds(
          startRect,
          direction,
          { x: point.x - grab.x, y: point.y - grab.y },
          minSize,
          area,
        );
        writeBounds(element, current);
      },
      /**
       * 놓으면 조절한 자리를 저장소에 반영한다. 취소되면 마지막으로 그린 자리로 돌아간다.
       * @param point 놓은 자리. 취소되면 null
       */
      (point) => {
        if (!isStarted) {
          return;
        }
        writeBounds(element, renderedRectRef.current);
        if (point !== null) {
          setBounds(id, current);
        }
        setInteraction(null);
      },
    );
  }

  return { handleTitleBarPointerDown, handleResizePointerDown };
}

/**
 * 누른 포인터를 요소에 붙잡고(`setPointerCapture`) 놓거나 취소될 때까지 따라간다.
 * @param handle 누른 요소
 * @param pointerId 포인터 id
 * @param toPoint 화면 좌표를 작업 영역 좌표로 바꾸는 함수
 * @param onMove 움직일 때
 * @param onEnd 놓을 때(자리) 또는 취소될 때(null). 한 번만 부른다
 * @returns 따라가기를 취소하는 함수. 이미 끝났으면 아무것도 하지 않는다
 */
function trackPointer(
  handle: HTMLElement,
  pointerId: number,
  toPoint: (pointer: PointerEvent) => WindowPoint,
  onMove: (point: WindowPoint) => void,
  onEnd: (point: WindowPoint | null) => void,
): () => void {
  let isTracking = true;
  /**
   * 움직인 자리를 알린다.
   * @param event 포인터 이벤트
   */
  function handleMove(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      onMove(toPoint(event));
    }
  }
  /**
   * 놓은 자리를 알리고 따라가기를 멈춘다.
   * @param event 포인터 이벤트
   */
  function handleUp(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      finish(toPoint(event));
    }
  }
  /**
   * 취소(포인터를 놓친 경우 포함)를 알리고 따라가기를 멈춘다.
   * @param event 포인터 이벤트
   */
  function handleCancel(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      finish(null);
    }
  }
  /**
   * 따라가기를 멈추고 끝을 한 번만 알린다.
   * @param point 놓은 자리. 취소면 null
   */
  function finish(point: WindowPoint | null): void {
    if (!isTracking) {
      return;
    }
    isTracking = false;
    stop();
    onEnd(point);
  }
  /** 이벤트를 떼고 붙잡은 포인터를 놓는다. */
  function stop(): void {
    handle.removeEventListener('pointermove', handleMove);
    handle.removeEventListener('pointerup', handleUp);
    handle.removeEventListener('pointercancel', handleCancel);
    handle.removeEventListener('lostpointercapture', handleCancel);
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
  }
  handle.addEventListener('pointermove', handleMove);
  handle.addEventListener('pointerup', handleUp);
  handle.addEventListener('pointercancel', handleCancel);
  handle.setPointerCapture(pointerId);
  handle.addEventListener('lostpointercapture', handleCancel);
  return () => {
    finish(null);
  };
}

/**
 * 창 요소의 자리를 인라인 스타일로 바로 바꾼다.
 * @param element 창 요소
 * @param bounds 자리
 */
function writeBounds(element: HTMLElement, bounds: WindowBounds): void {
  element.style.left = `${String(bounds.x)}px`;
  element.style.top = `${String(bounds.y)}px`;
  element.style.width = `${String(bounds.width)}px`;
  element.style.height = `${String(bounds.height)}px`;
}
