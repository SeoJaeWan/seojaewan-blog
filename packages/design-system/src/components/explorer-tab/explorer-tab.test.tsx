import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExplorerTab } from './explorer-tab';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('ExplorerTab', () => {
  it('title을 글자로 보이고 기본은 선택되지 않은 탭이다', () => {
    render(<ExplorerTab title="문서" icon={<i />} />);
    const tab = screen.getByRole('tab', { name: /문서/u });
    expect(tab).toHaveAttribute('aria-selected', 'false');
  });

  it('selected면 선택된 탭이다', () => {
    render(<ExplorerTab selected icon={<i />} />);
    expect(screen.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('icon으로 받은 아이콘을 그린다', () => {
    render(<ExplorerTab icon={<i>폴더</i>} />);
    expect(screen.getByText('폴더')).toBeInTheDocument();
  });

  it('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleClick = vi.fn();
    render(<ExplorerTab icon={<i />} onClose={handleClose} onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: '탭 닫기' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('닫기 버튼은 탭(role="tab") 안이 아니라 옆에 둔다', () => {
    render(<ExplorerTab icon={<i />} title="문서" />);
    expect(screen.getByRole('tab')).not.toContainElement(
      screen.getByRole('button', { name: '탭 닫기' }),
    );
  });

  it('tabIndex는 탭(role="tab")이 받는다', () => {
    render(<ExplorerTab icon={<i />} tabIndex={0} />);
    expect(screen.getByRole('tab')).toHaveAttribute('tabindex', '0');
  });
});
