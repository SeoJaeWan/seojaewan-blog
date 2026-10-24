import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DropDownButton } from './drop-down-button';

// @codocs [[컴포넌트 목록:상태]]
describe('DropDownButton', () => {
  it('글자를 접근성 이름으로 갖는 버튼이다', () => {
    render(<DropDownButton label="목록 보기" />);
    expect(screen.getByRole('button', { name: '목록 보기' })).toBeInTheDocument();
  });

  it('누르거나 키보드로 실행하면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DropDownButton onClick={handleClick} label="목록 보기" />);

    await user.tab();
    expect(screen.getByRole('button', { name: '목록 보기' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: '목록 보기' }));

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disabled면 누를 수 없고 Tab 포커스도 받지 않는다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DropDownButton disabled onClick={handleClick} label="목록 보기" />);

    await user.click(screen.getByRole('button', { name: '목록 보기' }));
    await user.tab();

    expect(screen.getByRole('button', { name: '목록 보기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '목록 보기' })).not.toHaveFocus();
    expect(handleClick).not.toHaveBeenCalled();
  });
});
