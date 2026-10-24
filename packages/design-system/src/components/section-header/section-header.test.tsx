import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
