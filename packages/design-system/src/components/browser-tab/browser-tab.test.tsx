import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BrowserTab } from './browser-tab';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('BrowserTab', () => {
  it('title을 글자로 보이고 기본은 선택되지 않은 탭이다', () => {
    render(<BrowserTab title="문서" favicon={<i />} />);
    expect(screen.getByRole('tab', { name: /문서/u })).toHaveAttribute('aria-selected', 'false');
  });

  it('active면 선택된 탭이다', () => {
    render(<BrowserTab active favicon={<i />} />);
    expect(screen.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('favicon과 closeIcon으로 받은 아이콘을 그린다', () => {
    render(<BrowserTab favicon={<i>파비콘</i>} closeIcon={<i>닫기</i>} />);
    expect(screen.getByText('파비콘')).toBeInTheDocument();
    expect(screen.getByText('닫기')).toBeInTheDocument();
  });

  it('선택되지 않은 탭만 구분선을 그리고 showSeparator=false면 그리지 않는다', () => {
    const { container, rerender } = render(<BrowserTab favicon={<i />} />);
    expect(container.querySelector('.bg-chrome-tab-separator')).not.toBeNull();
    rerender(<BrowserTab favicon={<i />} showSeparator={false} />);
    expect(container.querySelector('.bg-chrome-tab-separator')).toBeNull();
    rerender(<BrowserTab active favicon={<i />} />);
    expect(container.querySelector('.bg-chrome-tab-separator')).toBeNull();
  });

  it('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleClick = vi.fn();
    render(<BrowserTab favicon={<i />} onClose={handleClose} onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: '탭 닫기' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('닫기 버튼은 탭(role="tab") 안이 아니라 옆에 둔다', () => {
    render(<BrowserTab favicon={<i />} title="문서" />);
    expect(screen.getByRole('tab')).not.toContainElement(
      screen.getByRole('button', { name: '탭 닫기' }),
    );
  });

  it('tabIndex는 탭(role="tab")이 받는다', () => {
    render(<BrowserTab favicon={<i />} tabIndex={0} />);
    expect(screen.getByRole('tab')).toHaveAttribute('tabindex', '0');
  });
});
