import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WindowApp, WindowWorkArea } from '@/shared/utils/window-rules/window-rules';

import { useOpenApp } from './use-open-app';

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  it('앱을 열면 지금 작업 영역 크기로 그 앱의 새 창을 연다', () => {
    const open = vi.fn<(app: WindowApp, workArea: WindowWorkArea) => void>();
    const { result } = renderHook(() => useOpenApp(open));
    act(() => {
      result.current('chrome');
    });
    expect(open.mock.calls).toHaveLength(1);
    const [app, workArea] = open.mock.calls[0] ?? [];
    expect(app).toBe('chrome');
    expect(workArea?.width).toBeTypeOf('number');
    expect(workArea?.height).toBeTypeOf('number');
  });
});
