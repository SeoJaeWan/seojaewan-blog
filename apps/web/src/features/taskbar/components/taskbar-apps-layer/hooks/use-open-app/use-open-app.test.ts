import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';

import { useOpenApp } from './use-open-app';

afterEach(() => {
  useWindowStore.getState().reset();
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  it('앱을 열면 지금 작업 영역 크기로 그 앱의 새 창을 연다', () => {
    const { result } = renderHook(() => useOpenApp());
    act(() => {
      result.current('chrome');
    });
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
  });
});
