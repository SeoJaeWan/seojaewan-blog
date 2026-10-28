import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { createChromeContent } from '@/shared/utils/chrome-tabs/chrome-tabs';

import { useInitialWindow } from './use-initial-window';

afterEach(() => {
  useWindowStore.getState().reset();
  window.history.replaceState(null, '', '/');
});

/**
 * 열린 창의 내용.
 * @returns 창 내용들
 */
function windowContents(): unknown[] {
  const state = useWindowStore.getState();
  return state.order.map((id) => state.windows[id]?.content);
}

// @codocs [[창 동작:새로고침과 첫 진입]]
describe('창 동작:새로고침과 첫 진입', () => {
  it('글 주소로 들어오면 그 글 탭이 고른 Chrome 창 하나를 연다', () => {
    renderHook(() => useInitialWindow({ kind: 'post', slug: 'a' }));
    expect(windowContents()).toEqual([createChromeContent({ kind: 'post', slug: 'a' })]);
  });

  it('해당하는 글이 없으면 들어온 주소의 찾을 수 없음 Chrome 창 하나를 연다', () => {
    window.history.replaceState(null, '', '/posts/none');
    renderHook(() => useInitialWindow({ kind: 'not-found' }));
    expect(windowContents()).toEqual([
      createChromeContent({
        kind: 'not-found',
        url: 'seojaewan.com/posts/none',
        entryPath: '/posts/none',
      }),
    ]);
  });

  it('`/`이면 아무 창도 열지 않는다', () => {
    renderHook(() => useInitialWindow(null));
    expect(windowContents()).toEqual([]);
  });

  it('첫 창은 한 번만 연다', () => {
    const { rerender } = renderHook(() => useInitialWindow({ kind: 'post', slug: 'a' }));
    useWindowStore.getState().reset();
    rerender();
    expect(windowContents()).toEqual([]);
  });
});
