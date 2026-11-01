import { useSyncExternalStore } from 'react';

import { BREAKPOINTS } from '@seojaewan/design-system';

/** 화면 구간. 모바일이 먼저고, 그다음 노트북, 나머지는 PC다 */
export type Device = 'pc' | 'laptop' | 'mobile';

/** 컴포넌트 props의 피그마 Device 변형 이름. PC와 노트북은 모양이 같아 둘 다 desktop이다 */
export type DeviceVariant = 'desktop' | 'mobile';

// 경계값은 "이 값 미만"이라 CSS 조건에서는 1을 뺀다(`tokens.css`의 `laptop:`·`mobile:`과 같은 규칙).
/** 모바일 구간의 미디어 쿼리 */
export const MOBILE_MEDIA_QUERY = `(max-width: ${String(BREAKPOINTS.mobileWidth - 1)}px)`;

/** 노트북 구간의 미디어 쿼리. 모바일 폭도 맞으므로 모바일을 먼저 본다 */
export const LAPTOP_MEDIA_QUERY = `(max-width: ${String(BREAKPOINTS.laptopWidth - 1)}px), (max-height: ${String(BREAKPOINTS.laptopHeight - 1)}px)`;

/**
 * 지금 화면 구간을 돌려주고, 화면 크기가 경계를 넘나들면 다시 그린다.
 * 서버와 수화(hydration) 첫 렌더는 화면 크기를 모르므로 pc로 그린다. 수화가 끝난 뒤 실제 값으로 바뀌어
 * 서버 HTML과 첫 렌더가 어긋나지 않는다(`useSyncExternalStore`의 서버 값).
 * @codocs [[반응형:기준]]
 * @returns 화면 구간
 */
export function useDevice(): Device {
  return useSyncExternalStore(subscribeDevice, getDevice, getServerDevice);
}

/**
 * 화면 구간을 컴포넌트 props의 피그마 변형 이름으로 바꾼다. 층 컴포넌트가 컴포넌트에 넘기기 전에 부른다.
 * @codocs [[반응형:기준]]
 * @param device 화면 구간
 * @returns 피그마 Device 변형
 */
export function toDeviceVariant(device: Device): DeviceVariant {
  return device === 'mobile' ? 'mobile' : 'desktop';
}

/**
 * 화면 크기가 경계를 넘나들 때 알린다. `matchMedia`가 없는 환경(jsdom)에서는 알리지 않는다.
 * @param onChange 화면 구간이 바뀌면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeDevice(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQueries = [MOBILE_MEDIA_QUERY, LAPTOP_MEDIA_QUERY].map((query) =>
    window.matchMedia(query),
  );
  for (const mediaQuery of mediaQueries) {
    mediaQuery.addEventListener('change', onChange);
  }
  return () => {
    for (const mediaQuery of mediaQueries) {
      mediaQuery.removeEventListener('change', onChange);
    }
  };
}

/**
 * 지금 화면 구간. `matchMedia`가 없으면(jsdom) pc다.
 * @codocs [[반응형:기준]]
 * @returns 화면 구간
 */
function getDevice(): Device {
  if (typeof window.matchMedia !== 'function') {
    return 'pc';
  }
  if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
    return 'mobile';
  }
  return window.matchMedia(LAPTOP_MEDIA_QUERY).matches ? 'laptop' : 'pc';
}

/**
 * 서버와 수화 첫 렌더의 화면 구간.
 * @returns pc
 */
function getServerDevice(): Device {
  return 'pc';
}
