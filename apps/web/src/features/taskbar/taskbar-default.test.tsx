import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskbarDefault } from './taskbar-default';

// @codocs [[작업 표시줄:구성]]
describe('작업 표시줄:구성', () => {
  it('가운데에 Start 버튼과 검색 입력칸, 오른쪽에 시계가 있다', () => {
    render(<TaskbarDefault time="오후 3:24" date="2026-10-20" />);
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByText('오후 3:24')).toBeInTheDocument();
    expect(screen.getByText('2026-10-20')).toBeInTheDocument();
  });

  it('Start 버튼을 누르면 쓰는 곳에 알리고, 열림 상태를 aria-expanded로 보인다', async () => {
    const handleStartClick = vi.fn();
    render(<TaskbarDefault time="" date="" isStartOpen onStartClick={handleStartClick} />);
    const startButton = screen.getByRole('button', { name: '시작' });
    expect(startButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(startButton);
    expect(handleStartClick).toHaveBeenCalledTimes(1);
  });

  it('검색 입력칸에 포커스하면 쓰는 곳에 알린다', async () => {
    const handleSearchFocus = vi.fn();
    render(<TaskbarDefault time="" date="" searchBoxProps={{ onFocus: handleSearchFocus }} />);
    await userEvent.click(screen.getByRole('searchbox', { name: '검색' }));
    expect(handleSearchFocus).toHaveBeenCalledTimes(1);
  });

  it('좁은 화면의 검색 버튼을 누르면 쓰는 곳에 알린다', async () => {
    const handleSearchClick = vi.fn();
    render(
      <TaskbarDefault
        search="button"
        time=""
        date=""
        isSearchOpen={false}
        onSearchClick={handleSearchClick}
      />,
    );
    const searchButton = screen.getByRole('button', { name: '검색' });
    expect(searchButton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(searchButton);
    expect(handleSearchClick).toHaveBeenCalledTimes(1);
  });
});
