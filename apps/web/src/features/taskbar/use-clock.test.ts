import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatClock, useClock } from './use-clock';

// @codocs [[작업 표시줄:시계]]
describe('작업 표시줄:시계', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('기기의 현재 시간과 날짜를 `오후 3:24` / `2026-10-20` 모양으로 보여준다', () => {
    expect(formatClock(new Date(2026, 9, 20, 15, 24))).toEqual({
      time: '오후 3:24',
      date: '2026-10-20',
    });
    expect(formatClock(new Date(2026, 0, 5, 0, 7))).toEqual({
      time: '오전 12:07',
      date: '2026-01-05',
    });
    expect(formatClock(new Date(2026, 0, 5, 12, 0))).toEqual({
      time: '오후 12:00',
      date: '2026-01-05',
    });
  });

  it('분이 바뀔 때마다 갱신한다', () => {
    vi.setSystemTime(new Date(2026, 9, 20, 15, 24, 30));
    const { result } = renderHook(() => useClock());
    expect(result.current).toEqual({ time: '오후 3:24', date: '2026-10-20' });

    act(() => {
      vi.advanceTimersByTime(29_000);
    });
    expect(result.current?.time).toBe('오후 3:24');

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current?.time).toBe('오후 3:25');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current?.time).toBe('오후 3:26');
  });

  it('자정을 넘기면 날짜도 바뀐다', () => {
    vi.setSystemTime(new Date(2026, 9, 20, 23, 59, 50));
    const { result } = renderHook(() => useClock());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toEqual({ time: '오전 12:00', date: '2026-10-21' });
  });
});
