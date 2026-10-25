import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SectionHeader } from './section-header';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SectionHeader', () => {
  it('기본 글자는 머리글이다', () => {
    render(<SectionHeader />);
    expect(screen.getByText('머리글')).toHaveClass('type-body-strong');
  });

  it('label로 글자를 바꾼다', () => {
    render(<SectionHeader label="고정됨" />);
    expect(screen.getByText('고정됨')).toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<SectionHeader className="w-240" />);
    expect(container.firstChild).toHaveClass('w-240', 'px-12');
  });

  it('onClick이 없으면 버튼이 아니다', () => {
    render(<SectionHeader label="고정됨" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('onClick이 있으면 버튼으로 그리고, 누르면 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<SectionHeader label="고정됨" onClick={handleClick} />);
    await user.click(screen.getByRole('button', { name: '고정됨' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('버튼이어도 className과 글자 모양은 그대로다', () => {
    render(<SectionHeader label="고정됨" className="w-240" onClick={() => undefined} />);
    expect(screen.getByRole('button')).toHaveClass('px-12', 'pt-8', 'pb-4');
    expect(screen.getByRole('button').parentElement).toHaveClass('w-240');
    expect(screen.getByText('고정됨')).toHaveClass('type-body-strong');
  });
});
