import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IconButton } from './icon-button';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('IconButton', () => {
  it('label을 접근성 이름으로 갖는 버튼이다', () => {
    render(<IconButton label="더 보기" />);
    expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument();
  });

  it('누르거나 키보드로 실행하면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<IconButton onClick={handleClick} label="더 보기" />);

    await user.tab();
    expect(screen.getByRole('button', { name: '더 보기' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: '더 보기' }));

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disabled면 누를 수 없고 Tab 포커스도 받지 않는다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<IconButton disabled onClick={handleClick} label="더 보기" />);

    await user.click(screen.getByRole('button', { name: '더 보기' }));
    await user.tab();

    expect(screen.getByRole('button', { name: '더 보기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '더 보기' })).not.toHaveFocus();
    expect(handleClick).not.toHaveBeenCalled();
  });
});
