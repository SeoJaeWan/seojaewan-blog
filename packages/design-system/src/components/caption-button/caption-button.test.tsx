import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CaptionButton } from './caption-button';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('CaptionButton', () => {
  it('label을 접근성 이름으로 갖는 버튼이다', () => {
    render(<CaptionButton kind="close" label="닫기" />);
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });

  it('누르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<CaptionButton onClick={handleClick} label="최소화" />);

    await user.click(screen.getByRole('button', { name: '최소화' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('창이 비활성이어도 누를 수 있다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<CaptionButton inactive onClick={handleClick} label="최소화" />);

    await user.click(screen.getByRole('button', { name: '최소화' }));

    expect(screen.getByRole('button', { name: '최소화' })).toBeEnabled();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
