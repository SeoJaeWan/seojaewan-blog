import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
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
  resetRegisteredStores();
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

  it('미리보기가 떠 있는 동안 그 앱 버튼은 Hover 모양이다', () => {
    // 맨 앞 창이 다른 앱이라 Chrome 버튼은 running(바탕 없음)이다
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    const button = screen.getByRole('button', { name: 'Chrome' });
    expect(button).not.toHaveAttribute('data-preview-open');
    hoverMouse(button);
    wait(400);
    // Hover 모양은 이 속성의 변형 클래스(data-preview-open:*)가 그린다
    expect(button).toHaveAttribute('data-preview-open');
    expect(button).toHaveClass(
      'data-preview-open:border-control-stroke-default',
      'data-preview-open:bg-control-fill-default',
    );
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

const workArea = { width: 1920, height: 1032 };

/** 앱 창 층을 그린다. */
function renderLayer(): void {
  render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
}

/**
 * 앱 버튼 이름을 차례대로 돌려준다.
 * @returns 버튼 이름
 */
function getButtonNames(): string[] {
  return screen
    .getAllByRole('button')
    .filter((button) => button.hasAttribute('data-taskbar-app'))
    .map((button) => button.getAttribute('aria-label') ?? '');
}

/**
 * 앱 버튼을 우클릭해 메뉴를 연다.
 * @param name 버튼 이름
 */
function openAppMenu(name: string): void {
  fireEvent.contextMenu(screen.getByRole('button', { name }));
}

/**
 * 열린 메뉴의 항목 이름을 차례대로 돌려준다.
 * @returns 항목 이름
 */
function getMenuItemNames(): string[] {
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

/**
 * 메뉴 항목을 누른다.
 * @param name 항목 이름
 */
async function clickMenuItem(name: string): Promise<void> {
  await userEvent.click(screen.getByRole('menuitem', { name }));
}

// @codocs [[작업 표시줄:우클릭 메뉴]]
describe('작업 표시줄:우클릭 메뉴', () => {
  it('앱 버튼을 우클릭하면 앱 이름, 고정 해제, 창 닫기 메뉴를 연다', () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    openAppMenu('Chrome');
    expect(getMenuItemNames()).toEqual(['Chrome', '작업 표시줄에서 고정 해제', '창 닫기']);
  });

  it('메뉴가 열리면 창 미리보기를 닫는다', async () => {
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    expect(screen.getAllByRole('button', { name: 'chrome 창' })).toHaveLength(2);
    openAppMenu('Chrome');
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('앱 이름을 고르면 새 창을 연다', async () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    openAppMenu('Chrome');
    await clickMenuItem('Chrome');
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome', 'chrome']);
  });

  it('탐색기 이름을 고르면 새 탐색기 창을 연다', async () => {
    renderLayer();
    openAppMenu('파일 탐색기');
    await clickMenuItem('파일 탐색기');
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
  });

  it('고정 해제를 고르면 고정 목록에서 뺀다', async () => {
    renderLayer();
    openAppMenu('Chrome');
    await clickMenuItem('작업 표시줄에서 고정 해제');
    expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer']);
  });

  it('고정하지 않은 앱은 작업 표시줄에 고정을 고르면 고정 목록 맨 뒤에 붙인다', async () => {
    useWorkspaceStore.getState().unpinFromTaskbar('file-explorer');
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    openAppMenu('파일 탐색기');
    expect(getMenuItemNames()).toEqual(['파일 탐색기', '작업 표시줄에 고정', '창 닫기']);
    await clickMenuItem('작업 표시줄에 고정');
    expect(useWorkspaceStore.getState().taskbarPins).toEqual(['chrome', 'file-explorer']);
  });

  it('창 닫기를 고르면 그 앱의 창을 닫는다', async () => {
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    openAppMenu('Chrome');
    await clickMenuItem('창 닫기');
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
  });

  it('창이 여러 개면 모든 창 닫기로 그 앱의 창을 모두 닫는다', async () => {
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    openAppMenu('Chrome');
    await clickMenuItem('모든 창 닫기');
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
  });

  it('창이 없는 앱의 메뉴에는 창 닫기가 없다', () => {
    renderLayer();
    openAppMenu('Chrome');
    expect(getMenuItemNames()).toEqual(['Chrome', '작업 표시줄에서 고정 해제']);
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기 - 마지막 창을 닫은 뒤', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('고정하지 않은 앱의 마지막 창을 미리보기에서 닫은 뒤 그 앱 창을 다시 열어도 미리보기가 저절로 열리지 않는다', () => {
    useWorkspaceStore.getState().unpinFromTaskbar('chrome');
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Chrome' }), {
      pointerType: 'mouse',
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.click(screen.getByRole('button', { name: '창 닫기', hidden: true }));
    expect(screen.queryByRole('button', { name: 'Chrome' })).not.toBeInTheDocument();
    act(() => {
      useWindowStore.getState().open('chrome', workArea);
    });
    expect(screen.getByRole('button', { name: 'Chrome' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'chrome 창' })).not.toBeInTheDocument();
  });
});

// @codocs [[작업 표시줄:고정과 순서]]
describe('작업 표시줄:고정과 순서', () => {
  it('고정한 앱을 고정 순서대로 그린다', () => {
    useWorkspaceStore.getState().moveTaskbarPin('chrome', 0);
    renderLayer();
    expect(getButtonNames()).toEqual(['Chrome', '파일 탐색기']);
  });

  it('고정하지 않은 실행 중인 앱은 뒤에 붙는다', () => {
    useWorkspaceStore.getState().unpinFromTaskbar('file-explorer');
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    expect(getButtonNames()).toEqual(['Chrome', '파일 탐색기']);
  });

  it('고정을 해제한 앱은 창을 모두 닫으면 버튼이 사라진다', async () => {
    useWindowStore.getState().open('chrome', workArea);
    renderLayer();
    openAppMenu('Chrome');
    await clickMenuItem('작업 표시줄에서 고정 해제');
    expect(getButtonNames()).toEqual(['파일 탐색기', 'Chrome']);
    openAppMenu('Chrome');
    await clickMenuItem('창 닫기');
    expect(getButtonNames()).toEqual(['파일 탐색기']);
  });

  describe('앱 버튼을 끌어 순서 바꾸기', () => {
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };

    /** 버튼 자리를 40px 칸으로 정한다. jsdom은 레이아웃이 없다. */
    function layoutButtons(): void {
      document.querySelectorAll('[data-taskbar-app]').forEach((button, index) => {
        button.getBoundingClientRect = () => new DOMRect(index * 40, 0, 40, 40);
      });
    }

    /** Chrome 버튼을 탐색기 버튼 자리로 끌어 놓고 따라오는 클릭까지 보낸다. */
    function dragChromeToExplorer(): void {
      renderLayer();
      layoutButtons();
      const chrome = screen.getByRole('button', { name: 'Chrome' });
      fireEvent.pointerDown(chrome, { ...pointer, clientX: 60, clientY: 20 });
      fireEvent.pointerMove(chrome, { ...pointer, clientX: 20, clientY: 20 });
      fireEvent.pointerUp(chrome, { ...pointer, clientX: 20, clientY: 20 });
      fireEvent.click(chrome);
    }

    it('고정한 버튼을 다른 고정 버튼 자리로 끌어 놓으면 순서가 바뀐다', () => {
      dragChromeToExplorer();
      expect(useWorkspaceStore.getState().taskbarPins).toEqual(['chrome', 'file-explorer']);
    });

    it('끌기 뒤에 따라오는 클릭은 버튼 동작을 하지 않는다', () => {
      dragChromeToExplorer();
      expect(useWindowStore.getState().order).toEqual([]);
    });

    it('끌지 않고 누르면 버튼 동작을 한다', () => {
      renderLayer();
      layoutButtons();
      const chrome = screen.getByRole('button', { name: 'Chrome' });
      fireEvent.pointerDown(chrome, { ...pointer, clientX: 60, clientY: 20 });
      fireEvent.pointerUp(chrome, { ...pointer, clientX: 60, clientY: 20 });
      fireEvent.click(chrome);
      expect(useWindowStore.getState().order).toHaveLength(1);
    });
  });
});

/**
 * 열린 창마다 고른 탐색기 탭이 보는 위치.
 * @returns 창마다의 위치(탐색기가 아니면 undefined)
 */
function getExplorerLocations(): (string | null | undefined)[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => {
    const content = windows[id]?.content;
    if (content?.app !== 'file-explorer') {
      return undefined;
    }
    const tab = content.tabs[content.activeTabIndex];
    return tab?.history[tab.historyIndex];
  });
}

// @codocs [[창 동작:열기 규칙]]
describe('창 동작:열기 규칙 - 작업 표시줄에서 탐색기 열기', () => {
  it('작업 표시줄의 파일 탐색기 버튼은 탐색기를 바탕 화면 위치로 연다', async () => {
    renderLayer();
    await userEvent.click(screen.getByRole('button', { name: '파일 탐색기' }));
    expect(getExplorerLocations()).toEqual([null]);
  });

  it('작업 표시줄 우클릭 메뉴의 새 창도 탐색기를 바탕 화면 위치로 연다', async () => {
    useWindowStore.getState().open('file-explorer', workArea);
    renderLayer();
    openAppMenu('파일 탐색기');
    await clickMenuItem('파일 탐색기');
    expect(getExplorerLocations()).toEqual([null, null]);
  });
});
