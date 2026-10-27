import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExplorerWindow } from './explorer-window';

const TABS = [
  { id: 'tab-1', title: 'Blog', selected: true },
  { id: 'tab-2', title: 'React' },
] as const;

// @codocs [[파일 탐색기:탭]]
describe('파일 탐색기:탭', () => {
  it('탭을 누르면 창 층의 누르기 처리(창을 맨 앞으로)까지 전해진다', () => {
    const handleWindowPointerDown = vi.fn();
    const handleTitleBarPointerDown = vi.fn();
    render(
      <div onPointerDown={handleWindowPointerDown}>
        <ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />
      </div>,
    );
    fireEvent.pointerDown(screen.getByRole('tab', { name: /React/ }));
    expect(handleWindowPointerDown).toHaveBeenCalledTimes(1);
  });

  it('탭의 ×를 누르면 창 층의 누르기 처리까지 전해진다', () => {
    const handleWindowPointerDown = vi.fn();
    const handleTitleBarPointerDown = vi.fn();
    render(
      <div onPointerDown={handleWindowPointerDown}>
        <ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />
      </div>,
    );
    fireEvent.pointerDown(screen.getAllByRole('button', { name: '탭 닫기' })[1] ?? document.body);
    expect(handleWindowPointerDown).toHaveBeenCalledTimes(1);
  });

  it('탭 위에서 누른 것은 창 끌기를 시작하지 않는다', () => {
    const handleTitleBarPointerDown = vi.fn();
    render(<ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />);
    fireEvent.pointerDown(screen.getByRole('tab', { name: /React/ }));
    expect(handleTitleBarPointerDown).not.toHaveBeenCalled();
  });

  it('탭 묶음의 여백(탭 옆)에서 누른 것도 창 끌기를 시작하지 않는다', () => {
    const handleTitleBarPointerDown = vi.fn();
    render(<ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />);
    fireEvent.pointerDown(
      screen.getByRole('tab', { name: /React/ }).parentElement ?? document.body,
    );
    expect(handleTitleBarPointerDown).not.toHaveBeenCalled();
  });

  it('탭 줄 밖의 제목 표시줄을 누르면 창 끌기를 시작한다', () => {
    const handleTitleBarPointerDown = vi.fn();
    render(<ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />);
    fireEvent.pointerDown(screen.getByRole('tablist'));
    expect(handleTitleBarPointerDown).toHaveBeenCalledTimes(1);
  });

  it('탭을 끌어 다른 탭 자리로 가면 그 자리로 옮긴다', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
      this: Element,
    ) {
      const index =
        this.parentElement === null ? 0 : [...this.parentElement.children].indexOf(this);
      return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 32 });
    });
    const handleTabMove = vi.fn();
    render(<ExplorerWindow tabs={TABS} onTabMove={handleTabMove} />);
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;
    const react = screen.getByRole('tab', { name: /React/ });
    fireEvent.pointerDown(react, { ...pointer, clientX: 150, clientY: 10 });
    fireEvent.pointerMove(react, { ...pointer, clientX: 20, clientY: 10 });
    expect(handleTabMove).toHaveBeenCalledWith(1, 0);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
