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
});
