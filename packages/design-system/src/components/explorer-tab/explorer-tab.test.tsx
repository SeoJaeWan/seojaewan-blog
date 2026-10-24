import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExplorerTab } from './explorer-tab';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('ExplorerTab', () => {
  it('title을 글자로 보이고 기본은 선택되지 않은 탭이다', () => {
    render(<ExplorerTab title="문서" />);
    const tab = screen.getByRole('tab', { name: /문서/u });
    expect(tab).toHaveAttribute('aria-selected', 'false');
  });

  it('selected면 선택된 탭이다', () => {
    render(<ExplorerTab selected />);
    expect(screen.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleClick = vi.fn();
    render(<ExplorerTab onClose={handleClose} onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: '탭 닫기' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
