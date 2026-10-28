import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChromeWindowLayer } from '@/features/chrome/components/chrome-window-layer/chrome-window-layer';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { createChromeContent } from '@/shared/utils/chrome-tabs/chrome-tabs';

import { useBrowserAddressSync } from './use-browser-address-sync';

const WORK_AREA = { width: 1920, height: 1032 } as const;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
  useWindowStore.getState().reset();
  window.history.replaceState(null, '', '/');
});

// @codocs [[창 동작:브라우저 주소]]
describe('창 동작:브라우저 주소', () => {
  it('맨 앞 창이 글을 보는 Chrome 탭이면 그 글의 주소다', () => {
    renderHook(() => {
      useBrowserAddressSync();
    });
    act(() => {
      useWindowStore.getState().openPost('rsc', WORK_AREA);
    });
    expect(window.location.pathname).toBe('/posts/rsc');
  });

  it('맨 앞 창이 글이 아니면(새 탭 페이지, 탐색기, 창 없음) `/`다', () => {
    renderHook(() => {
      useBrowserAddressSync();
    });
    act(() => {
      useWindowStore.getState().openPost('rsc', WORK_AREA);
      useWindowStore.getState().open('file-explorer', WORK_AREA);
    });
    expect(window.location.pathname).toBe('/');
    act(() => {
      useWindowStore.getState().reset();
    });
    expect(window.location.pathname).toBe('/');
  });

  it('주소만 바꾸고 브라우저 기록에는 쌓지 않는다', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderHook(() => {
      useBrowserAddressSync();
    });
    act(() => {
      useWindowStore.getState().openPost('rsc', WORK_AREA);
    });
    expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/posts/rsc');
    expect(pushState).not.toHaveBeenCalled();
  });

  it('창 축소 화면처럼 Chrome 창만 다시 그리는 곳에서는 주소를 바꾸지 않는다', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const id = useWindowStore
      .getState()
      .open('chrome', WORK_AREA, createChromeContent({ kind: 'post', slug: 'rsc' }));
    const target = useWindowStore.getState().windows[id];
    if (target?.content.app !== 'chrome') {
      throw new Error('Chrome 창이 없다');
    }
    render(
      <ChromeWindowLayer
        windowId={id}
        content={target.content}
        device="desktop"
        controls={{
          inactive: false,
          placement: 'normal',
          onMinimize: vi.fn(),
          onClose: vi.fn(),
          className: '',
        }}
      />,
    );
    expect(replaceState).not.toHaveBeenCalled();
  });
});

// @codocs [[창 동작:새로고침과 첫 진입]]
describe('창 동작:새로고침과 첫 진입', () => {
  it('주소로 들어온 첫 창을 열기 전에는 들어온 주소를 `/`로 바꾸지 않는다', () => {
    window.history.replaceState(null, '', '/posts/rsc');
    renderHook(() => {
      useBrowserAddressSync(false);
    });
    expect(window.location.pathname).toBe('/posts/rsc');
  });
});
