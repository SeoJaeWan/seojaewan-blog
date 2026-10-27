import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('탭 줄 밖의 제목 표시줄을 누르면 창 끌기를 시작한다', () => {
    const handleTitleBarPointerDown = vi.fn();
    render(<ExplorerWindow tabs={TABS} onTitleBarPointerDown={handleTitleBarPointerDown} />);
    fireEvent.pointerDown(screen.getByRole('tablist'));
    expect(handleTitleBarPointerDown).toHaveBeenCalledTimes(1);
  });
});
