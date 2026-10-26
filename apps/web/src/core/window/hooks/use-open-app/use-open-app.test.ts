import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowStore } from '@/core/window/stores/window-store/window-store';

import { useOpenApp } from './use-open-app';

afterEach(() => {
  useWindowStore.getState().reset();
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  it('앱을 열면 그 앱의 새 창을 연다', () => {
    const { result } = renderHook(() => useOpenApp());
    act(() => {
      result.current('chrome');
    });
    const { windows, order } = useWindowStore.getState();
    expect(order).toHaveLength(1);
    const [id] = order;
    expect(windows[id ?? '']?.app).toBe('chrome');
  });
});
