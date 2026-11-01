import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BREAKPOINTS } from '@seojaewan/design-system';

import { getChromePageLayout, useChromePageLayout } from './use-chrome-page-layout';

/** 훅이 읽는 알림 항목의 부분 */
type FakeEntry = {
  /** 내용 상자 */
  contentRect: { width: number };
};

/** 시험이 너비를 알릴 수 있는 가짜 ResizeObserver */
class FakeResizeObserver {
  /** 지금 살아 있는 관찰자들 */
  static instances: FakeResizeObserver[] = [];

  private readonly callback: (entries: readonly FakeEntry[]) => void;

  constructor(callback: (entries: readonly FakeEntry[]) => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  /** 시험에서는 알림을 직접 보내므로 하는 일이 없다 */
  observe(): void {}

  /** 살아 있는 관찰자에서 뺀다 */
  disconnect(): void {
    FakeResizeObserver.instances = FakeResizeObserver.instances.filter((item) => item !== this);
  }

  /**
   * 너비가 바뀌었다고 알린다.
   * @param width 새 너비
   */
  notify(width: number): void {
    this.callback([{ contentRect: { width } }]);
  }
}

/**
 * 측정할 요소를 ref에 넣은 채로 훅을 그린다.
 * @param width 요소의 처음 너비
 * @returns renderHook 결과
 */
function renderLayout(
  width: number,
): RenderHookResult<ReturnType<typeof useChromePageLayout>, unknown> {
  const area = document.createElement('div');
  Object.defineProperty(area, 'offsetWidth', { value: width });
  return renderHook(() => {
    const result = useChromePageLayout();
    result.areaRef.current ??= area;
    return result;
  });
}

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });

  it('경계값 미만이면 좁은 모양, 이상이면 넓은 모양이다', () => {
    expect(getChromePageLayout(BREAKPOINTS.chromePageWidth - 1)).toBe('narrow');
    expect(getChromePageLayout(BREAKPOINTS.chromePageWidth)).toBe('wide');
  });

  it('처음 그릴 때 영역을 재어 모양을 정한다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { result } = renderLayout(BREAKPOINTS.chromePageWidth - 1);
    expect(result.current.layout).toBe('narrow');
  });

  it('너비가 경계를 넘으면 모양이 바뀌고, 숨겨 너비가 0이 되면 그대로 둔다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { result, unmount } = renderLayout(0);
    const observer = FakeResizeObserver.instances[0];
    expect(result.current.layout).toBe('wide');

    act(() => {
      observer?.notify(BREAKPOINTS.chromePageWidth - 1);
    });
    expect(result.current.layout).toBe('narrow');

    act(() => {
      observer?.notify(0);
    });
    expect(result.current.layout).toBe('narrow');

    unmount();
    expect(FakeResizeObserver.instances).toHaveLength(0);
  });
});
