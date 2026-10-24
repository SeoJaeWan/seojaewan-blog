import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ColumnHeader } from './column-header';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ColumnHeader', () => {
  it('기본 글자는 열 이름이고 정렬 꺾쇠가 없다', () => {
    const { container } = render(<ColumnHeader />);
    expect(screen.getByRole('button', { name: '열 이름' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('label로 글자를 바꾼다', () => {
    render(<ColumnHeader label="이름" />);
    expect(screen.getByRole('button', { name: '이름' })).toBeInTheDocument();
  });

  it('descending은 꺾쇠를 그대로, ascending은 뒤집어 그린다', () => {
    const { container, rerender } = render(<ColumnHeader sort="descending" />);
    expect(container.querySelector('svg')).not.toHaveClass('rotate-180');
    rerender(<ColumnHeader sort="ascending" />);
    expect(container.querySelector('svg')).toHaveClass('rotate-180');
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    render(<ColumnHeader className="w-188" />);
    expect(screen.getByRole('button')).toHaveClass('w-188', 'px-8');
  });
});
