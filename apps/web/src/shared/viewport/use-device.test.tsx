import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MOBILE_MEDIA_QUERY, useDevice } from './use-device';

type FakeMediaQuery = {
  /** 화면 폭이 기준을 넘나든 것처럼 바꾼다 */
  setMatches: (isMatched: boolean) => void;
};

/**
 * 테스트가 결과를 정하는 가짜 matchMedia를 넣는다.
 * @param isMatched 처음에 모바일 기준에 맞는지
 * @returns 결과 바꾸기
 */
function installMatchMedia(isMatched: boolean): FakeMediaQuery {
  const target = new EventTarget();
  const state = { matches: isMatched };
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      expect(query).toBe(MOBILE_MEDIA_QUERY);
      return {
        get matches() {
          return state.matches;
        },
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
      };
    }),
  );
  return {
    setMatches: (isNextMatched) => {
      state.matches = isNextMatched;
      target.dispatchEvent(new Event('change'));
    },
  };
}

/**
 * 훅 결과를 글자로 그린다(서버 렌더 확인용).
 * @returns 화면 방식 글자
 */
function DeviceText(): string {
  return useDevice();
}

// @codocs [[모바일:기준]]
describe('모바일:기준', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('화면 폭이 768px 미만이면 모바일 방식이다', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useDevice());
    expect(result.current).toBe('mobile');
  });

  it('768px 이상은 데스크톱 방식이고, 폭이 기준을 넘으면 바뀐다', () => {
    const mediaQuery = installMatchMedia(false);
    const { result } = renderHook(() => useDevice());
    expect(result.current).toBe('desktop');

    act(() => {
      mediaQuery.setMatches(true);
    });
    expect(result.current).toBe('mobile');
  });

  it('서버에서는 화면 폭을 모르므로 데스크톱 방식으로 그린다', () => {
    installMatchMedia(true);
    expect(renderToString(<DeviceText />)).toBe('desktop');
  });
});
