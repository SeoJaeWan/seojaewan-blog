import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getWorkArea, TASKBAR_HEIGHT, useWorkArea } from './use-work-area';

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('작업 영역은 화면에서 작업 표시줄 높이를 뺀 곳이다', () => {
    expect(getWorkArea(1920, 1080)).toEqual({ width: 1920, height: 1080 - TASKBAR_HEIGHT });
    expect(getWorkArea(390, 20)).toEqual({ width: 390, height: 0 });
  });

  it('화면 크기가 바뀌면 작업 영역도 바뀐다', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    const { result } = renderHook(() => useWorkArea());
    expect(result.current).toEqual({ width: 1280, height: 720 - TASKBAR_HEIGHT });

    act(() => {
      vi.stubGlobal('innerWidth', 390);
      vi.stubGlobal('innerHeight', 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ width: 390, height: 844 - TASKBAR_HEIGHT });
  });

  it('화면 크기가 0이면 null이고, 크기가 생기면 작업 영역을 돌려준다', () => {
    vi.stubGlobal('innerWidth', 0);
    vi.stubGlobal('innerHeight', 0);
    const { result } = renderHook(() => useWorkArea());
    expect(result.current).toBeNull();

    act(() => {
      vi.stubGlobal('innerWidth', 967);
      vi.stubGlobal('innerHeight', 846);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ width: 967, height: 846 - TASKBAR_HEIGHT });
  });
});

/**
 * 높이만 가진 가짜 visualViewport를 만든다.
 * @param height 보이는 높이
 * @returns resize를 보낼 수 있는 가짜 visualViewport
 */
function createVisualViewport(height: number): EventTarget & { height: number } {
  return Object.assign(new EventTarget(), { height });
}

// @codocs [[반응형:화면 채우기]]
describe('반응형:화면 채우기', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('visualViewport가 있으면 그 높이(반올림)로 작업 영역을 구한다', () => {
    vi.stubGlobal('innerWidth', 412);
    vi.stubGlobal('innerHeight', 915);
    vi.stubGlobal('visualViewport', createVisualViewport(860.4));
    const { result } = renderHook(() => useWorkArea());
    expect(result.current).toEqual({ width: 412, height: 860 - TASKBAR_HEIGHT });
  });

  it('visualViewport의 resize만 와도 작업 영역 높이가 바뀐다', () => {
    vi.stubGlobal('innerWidth', 412);
    vi.stubGlobal('innerHeight', 915);
    const visualViewport = createVisualViewport(800);
    vi.stubGlobal('visualViewport', visualViewport);
    const { result } = renderHook(() => useWorkArea());
    expect(result.current).toEqual({ width: 412, height: 800 - TASKBAR_HEIGHT });

    act(() => {
      visualViewport.height = 915;
      visualViewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ width: 412, height: 915 - TASKBAR_HEIGHT });
  });

  it('visualViewport가 없으면 innerHeight를 쓴다', () => {
    vi.stubGlobal('innerWidth', 360);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('visualViewport', null);
    const { result } = renderHook(() => useWorkArea());
    expect(result.current).toEqual({ width: 360, height: 800 - TASKBAR_HEIGHT });
  });
});
