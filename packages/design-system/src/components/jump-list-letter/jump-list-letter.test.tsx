import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JumpListLetter } from './jump-list-letter';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('JumpListLetter', () => {
  it('label을 글자이자 접근성 이름으로 갖는 버튼이다', () => {
    render(<JumpListLetter label="가" />);
    expect(screen.getByRole('button', { name: '가' })).toBeInTheDocument();
  });

  it('누르거나 키보드로 실행하면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<JumpListLetter label="A" onClick={handleClick} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'A' }));

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disabled면 누를 수 없고 Tab 포커스도 받지 않는다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<JumpListLetter disabled label="A" onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: 'A' }));
    await user.tab();

    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveFocus();
    expect(handleClick).not.toHaveBeenCalled();
  });
});
