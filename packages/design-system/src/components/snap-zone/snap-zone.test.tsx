import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SnapZone } from './snap-zone';

// @codocs [[컴포넌트 목록:상태]]
describe('SnapZone', () => {
  it('기본 칠과 선 토큰 클래스를 쓴다', () => {
    const { container } = render(<SnapZone label="왼쪽 절반" />);
    expect(container.firstElementChild).toHaveClass(
      'h-56',
      'w-40',
      'rounded-control',
      'border-default',
      'border-control-stroke-default',
      'bg-control-alt-fill-secondary',
    );
  });

  it('Hover 상태는 강조색 클래스로 그린다', () => {
    const { container } = render(<SnapZone label="왼쪽 절반" />);
    expect(container.firstElementChild).toHaveClass(
      'hover:bg-accent-fill-default',
      'hover:border-control-stroke-on-accent-default',
    );
  });

  it('label을 접근성 이름으로 갖는 버튼이다', () => {
    render(<SnapZone label="오른쪽 절반" />);
    expect(screen.getByRole('button', { name: '오른쪽 절반' })).toBeInTheDocument();
  });

  it('누르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SnapZone label="왼쪽 절반" onClick={handleClick} />);
    await user.click(screen.getByRole('button', { name: '왼쪽 절반' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
