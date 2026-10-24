import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PinnedTile } from './pinned-tile';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('PinnedTile', () => {
  it('label을 글자로 보이고 icon 자리에 넘긴 아이콘을 그린다', () => {
    render(<PinnedTile label="메모장" icon={<svg data-testid="icon" />} />);
    expect(screen.getByRole('button', { name: '메모장' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('label을 비우면 피그마 기본 문구를 보인다', () => {
    render(<PinnedTile icon={<svg />} />);
    expect(screen.getByRole('button', { name: '앱 이름' })).toBeInTheDocument();
  });

  it('누르면 onClick을 부르고 크기는 95×84로 고정한다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<PinnedTile icon={<svg />} onClick={handleClick} />);
    const button = screen.getByRole('button');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveClass('w-95', 'h-84');
  });
});
