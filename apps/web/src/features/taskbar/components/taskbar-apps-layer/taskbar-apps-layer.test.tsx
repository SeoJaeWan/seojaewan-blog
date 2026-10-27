import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';

import { TaskbarAppsLayer } from './taskbar-apps-layer';

/**
 * 창 내용 자리에 앱 이름을 그린다. 미리보기 축소 화면에 쓰는 곳이 넘긴 내용이 들어가는지 본다.
 * @param target 열린 창
 * @returns 앱 이름
 */
function renderAppName(target: OpenWindow): string {
  return `창 내용 ${target.app}`;
}

/**
 * 창 제목을 정한다.
 * @param target 열린 창
 * @returns 창 제목
 */
function getTitle(target: OpenWindow): string {
  return `${target.app} 창`;
}

afterEach(() => {
  useWindowStore.getState().reset();
});

// @codocs [[작업 표시줄:앱 버튼]]
describe('작업 표시줄:앱 버튼', () => {
  it('열린 창이 없을 때 앱 버튼을 누르면 그 앱 창을 연다', async () => {
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기', () => {
  it('창이 여러 개일 때 누르면 쓰는 곳이 넘긴 제목과 창 내용으로 미리보기를 띄운다', async () => {
    const workArea = { width: 1920, height: 1032 };
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('chrome', workArea);
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    expect(screen.getAllByRole('button', { name: 'chrome 창' })).toHaveLength(2);
    expect(screen.getAllByText('창 내용 chrome')).toHaveLength(2);
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기 - 마우스를 올려 열기', () => {
  const workArea = { width: 1920, height: 1032 };

  // 가짜 타이머에서는 Testing Library의 userEvent 비동기 대기가 멈추므로 fireEvent로 포인터를 움직인다.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** 앱 창 층을 그린다. */
  function renderLayer(): void {
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
  }

  /**
   * 마우스를 요소에 올린다.
   * @param element 요소
   */
  function hoverMouse(element: HTMLElement): void {
    fireEvent.pointerEnter(element, { pointerType: 'mouse' });
  }

  /**
   * 마우스를 요소에서 뗀다.
   * @param element 요소
   */
  function leaveMouse(element: HTMLElement): void {
    fireEvent.pointerLeave(element, { pointerType: 'mouse' });
  }

  /**
   * 시간을 흘려 보낸다.
   * @param ms 흘려 보낼 시간(ms)
   */
  function wait(ms: number): void {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it('창이 있는 앱 버튼에 마우스를 400ms 올리면 창이 하나여도 미리보기를 띄운다', () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    hoverMouse(screen.getByRole('button', { name: 'Chrome' }));
    wait(399);
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
    wait(1);
    expect(screen.getByRole('button', { name: 'chrome 창' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chrome' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('창이 없는 앱 버튼에는 미리보기를 띄우지 않는다', () => {
    renderLayer();
    hoverMouse(screen.getByRole('button', { name: 'Chrome' }));
    wait(1000);
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
  });

  it('버튼과 미리보기 밖으로 나가 300ms가 지나면 닫고, 미리보기로 옮겨 가면 닫지 않는다', () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    const button = screen.getByRole('button', { name: 'Chrome' });
    hoverMouse(button);
    wait(400);
    const preview = screen.getByRole('button', { name: 'chrome 창' });
    // 버튼에서 나가 미리보기로 들어간다(둘은 같은 Popover 안이라 밖으로 나간 적이 없다)
    wait(200);
    hoverMouse(preview);
    wait(1000);
    expect(screen.getByRole('button', { name: 'chrome 창' })).toBeInTheDocument();
    leaveMouse(preview);
    wait(299);
    expect(screen.getByRole('button', { name: 'chrome 창' })).toBeInTheDocument();
    wait(1);
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
  });

  it('마우스를 올려 연 목록을 누르면 닫지 않고, 창이 하나인 앱 버튼의 클릭 동작은 그대로다', () => {
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    const button = screen.getByRole('button', { name: 'Chrome' });
    hoverMouse(button);
    wait(400);
    fireEvent.click(button);
    expect(screen.getAllByRole('button', { name: 'chrome 창' })).toHaveLength(2);
    act(() => {
      useWindowStore.getState().close('window-2');
    });
    fireEvent.click(button);
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
    expect(useWindowStore.getState().windows['window-1']?.isMinimized).toBe(true);
  });

  it('터치는 올리는 동작을 세지 않는다', () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Chrome' }), {
      pointerType: 'touch',
    });
    wait(1000);
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이 - 창 미리보기 목록', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('미리보기 목록을 화면 폭에서 좌우 12px 여백을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다', async () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const workArea = { width: 390, height: 796 };
    for (let count = 0; count < 3; count += 1) {
      useWindowStore.getState().open('chrome', workArea);
    }
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    const cards = screen.getAllByRole('button', { name: 'chrome 창' });
    // 390 - 12 * 2 = 366, (366 - 10 - 4 * 2) / 3 = 116
    expect(cards[0]?.parentElement).toHaveStyle({ width: '366px' });
    expect(cards[0]).toHaveStyle({ width: '116px' });
  });
});
