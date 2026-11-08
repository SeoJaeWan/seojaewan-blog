import { useSyncExternalStore } from 'react';

/** 작업 표시줄 높이(px). 작업 영역은 화면에서 이 높이를 뺀 곳이다 */
export const TASKBAR_HEIGHT = 48;

/**
 * 창을 놓을 수 있는 작업 영역 크기(px). 화면 왼쪽 위가 원점이다
 * - width: 작업 영역 너비. 화면 너비와 같다
 * - height: 작업 영역 높이. 화면 높이에서 작업 표시줄 높이를 뺀다
 */
export type WorkArea = {
  width: number;
  height: number;
};

/**
 * 작업 영역(화면에서 작업 표시줄을 뺀 곳) 크기를 돌려주고, 화면 크기가 바뀌면 다시 그린다.
 * 서버와 수화(hydration) 첫 렌더는 화면 크기를 모르므로 `null`이다. 창을 놓는 쪽은 `null`이면 창을 그리지 않는다.
 * 숨겨진 탭처럼 화면 너비나 높이가 0이면 아직 크기를 모르는 것과 같아 `null`이다. 이때 계산한 크기로 첫 창을 열면 0×0으로 남기 때문이며,
 * 탭이 보여 화면 크기가 생기면(`resize`) 그때 값을 돌려준다.
 * 화면 높이는 보이는 높이(`visualViewport`, 없으면 `innerHeight`)이고 그 `resize`도 구독한다.
 * @codocs [[반응형:화면 채우기]]
 * @codocs [[창 동작:창 조작]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @returns 작업 영역 크기. 마운트 전이거나 화면 크기가 0이면 `null`
 */
export function useWorkArea(): WorkArea | null {
  const width = useSyncExternalStore(subscribeResize, getViewportWidth, getServerSize);
  const height = useSyncExternalStore(subscribeResize, getViewportHeight, getServerSize);
  if (width === null || height === null || width <= 0 || height <= 0) {
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
 * 화면 크기가 바뀔 때 알린다. 인앱 브라우저처럼 주소창이 접히며 보이는 높이만 바뀌는 경우는 `window`의 `resize`가
 * 오지 않을 수 있어, `visualViewport`가 있으면 그 `resize`도 구독한다.
 * @codocs [[반응형:화면 채우기]]
 * @param onChange 크기가 바뀌면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeResize(onChange: () => void): () => void {
  const { visualViewport } = window;
  window.addEventListener('resize', onChange);
  visualViewport?.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    visualViewport?.removeEventListener('resize', onChange);
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
 * 지금 화면 높이. 보이는 높이(`visualViewport`)가 있으면 그것을, 없으면 `innerHeight`를 쓴다.
 * 창 위치는 정수 px라 반올림한다(`visualViewport.height`는 소수일 수 있다).
 * @codocs [[반응형:화면 채우기]]
 * @returns 화면 높이(px)
 */
function getViewportHeight(): number {
  const visibleHeight = window.visualViewport?.height;
  return visibleHeight === undefined ? window.innerHeight : Math.round(visibleHeight);
}

/**
 * 서버와 수화 첫 렌더의 화면 크기. 모르므로 비운다.
 * @returns null
 */
function getServerSize(): null {
  return null;
}
