import { useSyncExternalStore } from 'react';

/** 작업 표시줄 높이(px). 작업 영역은 화면에서 이 높이를 뺀 곳이다 */
export const TASKBAR_HEIGHT = 48;

/** 창을 놓을 수 있는 작업 영역 크기(px). 화면 왼쪽 위가 원점이다 */
export type WorkArea = {
  /** 작업 영역 너비. 화면 너비와 같다 */
  width: number;
  /** 작업 영역 높이. 화면 높이에서 작업 표시줄 높이를 뺀다 */
  height: number;
};

/**
 * 작업 영역(화면에서 작업 표시줄을 뺀 곳) 크기를 돌려주고, 화면 크기가 바뀌면 다시 그린다.
 * 서버와 수화(hydration) 첫 렌더는 화면 크기를 모르므로 `null`이다. 창을 놓는 쪽은 `null`이면 창을 그리지 않는다.
 * @codocs [[창 동작:창 조작]]
 * @returns 작업 영역 크기. 마운트 전에는 `null`
 */
export function useWorkArea(): WorkArea | null {
  const width = useSyncExternalStore(subscribeResize, getViewportWidth, getServerSize);
  const height = useSyncExternalStore(subscribeResize, getViewportHeight, getServerSize);
  if (width === null || height === null) {
    return null;
  }
  return getWorkArea(width, height);
}

/**
 * 화면 크기에서 작업 영역 크기를 구한다. 화면이 작업 표시줄보다 낮으면 높이는 0이다.
 * @param viewportWidth 화면 너비
 * @param viewportHeight 화면 높이
 * @returns 작업 영역 크기
 */
export function getWorkArea(viewportWidth: number, viewportHeight: number): WorkArea {
  return { width: viewportWidth, height: Math.max(0, viewportHeight - TASKBAR_HEIGHT) };
}

/**
 * 화면 크기가 바뀔 때 알린다.
 * @param onChange 크기가 바뀌면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeResize(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
  };
}

/**
 * 지금 화면 너비.
 * @returns 화면 너비(px)
 */
function getViewportWidth(): number {
  return window.innerWidth;
}

/**
 * 지금 화면 높이.
 * @returns 화면 높이(px)
 */
function getViewportHeight(): number {
  return window.innerHeight;
}

/**
 * 서버와 수화 첫 렌더의 화면 크기. 모르므로 비운다.
 * @returns null
 */
function getServerSize(): null {
  return null;
}
