import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Separator } from './separator';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('Separator', () => {
  it('기본은 가로선이다', () => {
    render(<Separator />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator).toHaveClass('h-stroke-default');
  });

  it('vertical은 높이 16의 세로선이다', () => {
    render(<Separator orientation="vertical" />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveClass('h-16', 'w-stroke-default');
  });
});
