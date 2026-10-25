import { useSyncExternalStore } from 'react';

/** 화면 방식. 좁은 화면은 mobile, 태블릿을 포함한 나머지는 desktop이다 */
export type Device = 'desktop' | 'mobile';

/** 모바일 방식으로 보여 주는 화면 폭(768px 미만) */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/**
 * 지금 화면 폭이 모바일 방식인지 데스크톱 방식인지 돌려주고, 폭이 기준을 넘나들면 다시 그린다.
 * 서버와 수화(hydration) 첫 렌더는 화면 폭을 모르므로 desktop으로 그린다. 수화가 끝난 뒤 실제 값으로 바뀌어
 * 서버 HTML과 첫 렌더가 어긋나지 않는다(`useSyncExternalStore`의 서버 값).
 * @codocs [[모바일:기준]]
 * @returns 화면 방식
 */
export function useDevice(): Device {
  return useSyncExternalStore(subscribeDevice, getDevice, getServerDevice);
}

/**
 * 화면 폭이 모바일 기준을 넘나들 때 알린다. `matchMedia`가 없는 환경(jsdom)에서는 알리지 않는다.
 * @param onChange 화면 방식이 바뀌면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeDevice(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => {
    mediaQuery.removeEventListener('change', onChange);
  };
}

/**
 * 지금 화면 방식. `matchMedia`가 없으면(jsdom) desktop이다.
 * @codocs [[모바일:기준]]
 * @returns 화면 방식
 */
function getDevice(): Device {
  if (typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 'mobile' : 'desktop';
}

/**
 * 서버와 수화 첫 렌더의 화면 방식.
 * @returns desktop
 */
function getServerDevice(): Device {
  return 'desktop';
}
