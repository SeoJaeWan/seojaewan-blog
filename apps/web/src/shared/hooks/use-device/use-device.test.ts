import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BREAKPOINTS } from '@seojaewan/design-system';

import { LAPTOP_MEDIA_QUERY, MOBILE_MEDIA_QUERY, toDeviceVariant, useDevice } from './use-device';

type FakeScreen = {
  /** 화면 크기가 바뀐 것처럼 맞는 조건을 바꾼다 */
  setMatched: (matched: readonly string[]) => void;
};

/**
 * 테스트가 결과를 정하는 가짜 matchMedia를 넣는다.
 * @param initial 처음에 맞는 미디어 쿼리들
 * @returns 결과 바꾸기
 */
function installMatchMedia(initial: readonly string[]): FakeScreen {
  const target = new EventTarget();
  const state = { matched: initial };
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      expect([MOBILE_MEDIA_QUERY, LAPTOP_MEDIA_QUERY]).toContain(query);
      return {
        get matches() {
          return state.matched.includes(query);
        },
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
      };
    }),
  );
  return {
    setMatched: (matched) => {
      state.matched = matched;
      target.dispatchEvent(new Event('change'));
    },
  };
}

/**
 * 훅 결과를 글자로 그린다(서버 렌더 확인용).
 * @returns 화면 구간 글자
 */
function DeviceText(): string {
  return useDevice();
}

// @codocs [[반응형:기준]]
describe('반응형:기준', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('미디어 쿼리는 생성된 경계값 미만을 뜻한다', () => {
    expect(MOBILE_MEDIA_QUERY).toBe(`(max-width: ${String(BREAKPOINTS.mobileWidth - 1)}px)`);
    expect(LAPTOP_MEDIA_QUERY).toBe(
      `(max-width: ${String(BREAKPOINTS.laptopWidth - 1)}px), (max-height: ${String(BREAKPOINTS.laptopHeight - 1)}px)`,
    );
  });

  it('두 조건이 모두 맞으면 모바일 판정이 먼저다', () => {
    installMatchMedia([MOBILE_MEDIA_QUERY, LAPTOP_MEDIA_QUERY]);
    const { result } = renderHook(() => useDevice());
    expect(result.current).toBe('mobile');
  });

  it('노트북 조건만 맞으면 노트북이다', () => {
    installMatchMedia([LAPTOP_MEDIA_QUERY]);
    const { result } = renderHook(() => useDevice());
    expect(result.current).toBe('laptop');
  });

  it('아무 조건도 맞지 않으면 PC이고, 화면 크기가 경계를 넘으면 바뀐다', () => {
    const screen = installMatchMedia([]);
    const { result } = renderHook(() => useDevice());
    expect(result.current).toBe('pc');

    act(() => {
      screen.setMatched([LAPTOP_MEDIA_QUERY]);
    });
    expect(result.current).toBe('laptop');

    act(() => {
      screen.setMatched([MOBILE_MEDIA_QUERY, LAPTOP_MEDIA_QUERY]);
    });
    expect(result.current).toBe('mobile');
  });

  it('서버에서는 화면 크기를 모르므로 PC로 그린다', () => {
    installMatchMedia([MOBILE_MEDIA_QUERY]);
    expect(renderToString(createElement(DeviceText))).toBe('pc');
  });

  it('PC와 노트북은 피그마 변형 desktop, 모바일은 mobile이다', () => {
    expect(toDeviceVariant('pc')).toBe('desktop');
    expect(toDeviceVariant('laptop')).toBe('desktop');
    expect(toDeviceVariant('mobile')).toBe('mobile');
  });
});
