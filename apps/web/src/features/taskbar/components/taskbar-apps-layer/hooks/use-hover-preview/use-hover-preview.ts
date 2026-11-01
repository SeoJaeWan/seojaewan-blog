import { useEffect, useRef } from 'react';

/** 포인터 이벤트에서 이 훅이 읽는 것. 포인터 종류만 본다 */
type HoverPointerEvent = { pointerType: string };

/** 앱 버튼에 마우스를 올리고 창 미리보기를 띄우기까지 기다리는 시간(ms) */
export const HOVER_PREVIEW_OPEN_DELAY = 400;

/** 앱 버튼과 미리보기 밖으로 나가고 창 미리보기를 닫기까지 기다리는 시간(ms) */
export const HOVER_PREVIEW_CLOSE_DELAY = 300;

type UseHoverPreviewOptions<T> = {
  /** 마우스를 올린 채 기다리면 부른다. 미리보기를 띄운다 */
  onOpen: (target: T) => void;
  /** 버튼과 미리보기 밖으로 나가 기다리면 부른다. 미리보기를 닫는다 */
  onClose: () => void;
};

type UseHoverPreviewResult<T> = {
  /** 버튼이나 미리보기에 포인터가 들어왔을 때 부른다. 마우스일 때만 센다 */
  handlePointerEnter: (target: T, event: HoverPointerEvent) => void;
  /** 버튼과 미리보기에서 포인터가 나갔을 때 부른다. 마우스일 때만 센다 */
  handlePointerLeave: (event: HoverPointerEvent) => void;
  /** 기다리던 열기·닫기를 모두 취소한다. 클릭처럼 다른 방법으로 미리보기를 정할 때 부른다 */
  cancel: () => void;
};

/**
 * 작업 표시줄 앱 버튼에 마우스를 올려 창 미리보기를 여닫는 시간을 잰다.
 * 올린 채 400ms 지나면 열고, 버튼과 미리보기 밖으로 나가 300ms 지나면 닫는다. 그 사이 다시 들어오면 닫기를 취소해,
 * 버튼에서 미리보기로 옮겨 가는 틈에 닫히지 않는다. 터치와 펜은 올리는 동작이 없어 세지 않는다(기존 클릭 동작을 쓴다).
 * 열지 닫을지는 쓰는 곳이 정하고, 이 훅은 시간만 잰다.
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param options 열기·닫기 알림
 * @returns 포인터 들어옴·나감 처리와 취소
 */
export function useHoverPreview<T>(options: UseHoverPreviewOptions<T>): UseHoverPreviewResult<T> {
  const { onOpen, onClose } = options;
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(
    /**
     * 사라질 때 기다리던 시간을 모두 취소한다.
     * @returns 취소하는 함수
     */
    () => {
      return () => {
        if (openTimerRef.current !== null) {
          window.clearTimeout(openTimerRef.current);
        }
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }
      };
    },
    [],
  );

  /** 기다리던 열기를 취소한다. */
  function clearOpenTimer(): void {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }

  /** 기다리던 닫기를 취소한다. */
  function clearCloseTimer(): void {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  /**
   * 포인터가 들어오면 닫기를 취소하고 열기를 기다린다.
   * @param target 포인터를 올린 버튼의 대상
   * @param event 포인터 이벤트
   */
  function handlePointerEnter(target: T, event: HoverPointerEvent): void {
    if (event.pointerType !== 'mouse') {
      return;
    }
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      onOpen(target);
    }, HOVER_PREVIEW_OPEN_DELAY);
  }

  /**
   * 포인터가 나가면 열기를 취소하고 닫기를 기다린다.
   * @param event 포인터 이벤트
   */
  function handlePointerLeave(event: HoverPointerEvent): void {
    if (event.pointerType !== 'mouse') {
      return;
    }
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, HOVER_PREVIEW_CLOSE_DELAY);
  }

  /** 기다리던 열기와 닫기를 모두 취소한다. */
  function cancel(): void {
    clearOpenTimer();
    clearCloseTimer();
  }

  return { handlePointerEnter, handlePointerLeave, cancel };
}
