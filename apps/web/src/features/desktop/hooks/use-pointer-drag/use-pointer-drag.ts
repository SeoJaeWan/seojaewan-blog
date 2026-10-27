import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef } from 'react';

import { hasPassedDragThreshold } from '@/shared/utils/window-drag-rules/window-drag-rules';

/** 화면 위 포인터 자리(px, 화면 왼쪽 위 기준) */
export type PointerPoint = {
  /** 가로 */
  x: number;
  /** 세로 */
  y: number;
};

/** 누른 포인터를 따라가며 부를 함수 */
export type PointerDragCallbacks = {
  /** 끌기 거리를 넘어 끌기가 시작될 때 부른다 */
  onStart?: (start: PointerPoint, point: PointerPoint) => void;
  /** 끌기가 시작된 뒤 포인터가 움직일 때마다 부른다 */
  onMove?: (point: PointerPoint) => void;
  /** 끌던 포인터를 놓을 때 부른다. 끌기 전에 놓으면(클릭) 부르지 않는다 */
  onDrop?: (point: PointerPoint) => void;
  /** 끌기가 취소될 때 부른다(포인터를 놓침, 언마운트) */
  onCancel?: () => void;
};

/**
 * 누른 포인터를 끌기로 따라가는 함수를 돌려준다. 바탕화면 아이콘 끌기와 끄는 사각형이 쓴다.
 * - 마우스 왼쪽 버튼과 펜만 받는다. 터치는 받지 않는다(모바일은 끌기가 없고, 터치 스크롤을 막지 않는다).
 * - 누른 요소에 포인터를 붙잡아(pointer capture) 포인터가 요소 밖으로 나가도 따라간다.
 * - 누른 뒤 끌기 거리(창 끌기와 같은 4px)를 넘게 움직여야 끌기를 시작해 클릭·더블클릭과 구분한다.
 * - 끄는 도중 쓰는 컴포넌트가 사라지면 끌기를 취소한다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @returns 누르기 이벤트와 부를 함수를 받아 따라가기를 시작하는 함수. 받지 않는 누르기면 false를 돌려준다
 */
export function usePointerDrag(): (
  event: ReactPointerEvent,
  callbacks: PointerDragCallbacks,
) => boolean {
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(
    /**
     * 사라질 때 진행 중인 끌기를 취소한다.
     * @returns 취소하는 정리 함수
     */
    () => {
      return () => {
        cancelRef.current?.();
      };
    },
    [],
  );

  /**
   * 누른 포인터를 따라가기 시작한다.
   * @param event 누르기 이벤트
   * @param callbacks 부를 함수
   * @returns 따라가기를 시작했으면 true
   */
  function startPointerDrag(event: ReactPointerEvent, callbacks: PointerDragCallbacks): boolean {
    const isPrimary =
      event.button === 0 && (event.pointerType === 'mouse' || event.pointerType === 'pen');
    if (!isPrimary) {
      return false;
    }
    cancelRef.current?.();
    const handle = event.currentTarget;
    const { pointerId } = event;
    const start = { x: event.clientX, y: event.clientY };
    let isDragging = false;
    let isTracking = true;

    /**
     * 움직이면 끌기 거리를 넘었는지 보고, 넘었으면 따라간다.
     * @param moveEvent 포인터 이벤트
     */
    function handleMove(moveEvent: Event): void {
      if (!isPointerEvent(moveEvent, pointerId)) {
        return;
      }
      const point = { x: moveEvent.clientX, y: moveEvent.clientY };
      if (!isDragging) {
        if (!hasPassedDragThreshold(start, point)) {
          return;
        }
        isDragging = true;
        callbacks.onStart?.(start, point);
      }
      callbacks.onMove?.(point);
    }

    /**
     * 놓으면 끌던 중이었을 때만 알린다.
     * @param upEvent 포인터 이벤트
     */
    function handleUp(upEvent: Event): void {
      if (!isPointerEvent(upEvent, pointerId)) {
        return;
      }
      stop();
      if (isDragging) {
        callbacks.onDrop?.({ x: upEvent.clientX, y: upEvent.clientY });
      }
    }

    /**
     * 포인터를 놓치면 취소한다.
     * @param cancelEvent 포인터 이벤트
     */
    function handleCancel(cancelEvent: Event): void {
      if (isPointerEvent(cancelEvent, pointerId)) {
        cancel();
      }
    }

    /** 따라가기를 멈추고, 끌던 중이었으면 취소를 알린다. */
    function cancel(): void {
      if (!isTracking) {
        return;
      }
      stop();
      if (isDragging) {
        callbacks.onCancel?.();
      }
    }

    /** 이벤트를 떼고 붙잡은 포인터를 놓는다. */
    function stop(): void {
      isTracking = false;
      cancelRef.current = null;
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
    capturePointer(handle, pointerId);
    handle.addEventListener('lostpointercapture', handleCancel);
    cancelRef.current = cancel;
    return true;
  }

  return startPointerDrag;
}

/**
 * 누른 요소에 포인터를 붙잡는다. 포인터가 이미 사라졌으면(누르자마자 놓음) 붙잡지 않고, 요소에 오는 이벤트만 따라간다.
 * @param handle 누른 요소
 * @param pointerId 포인터 id
 */
function capturePointer(handle: Element, pointerId: number): void {
  try {
    handle.setPointerCapture(pointerId);
  } catch {
    // 붙잡을 포인터가 없다. 놓는 이벤트는 요소에서 받는다.
  }
}

/**
 * 이벤트가 따라가는 포인터의 포인터 이벤트인지 본다.
 * @param event 이벤트
 * @param pointerId 따라가는 포인터 id
 * @returns 맞으면 true
 */
function isPointerEvent(event: Event, pointerId: number): event is PointerEvent {
  return 'pointerId' in event && event.pointerId === pointerId;
}
