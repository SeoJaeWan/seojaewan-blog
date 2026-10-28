import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './checkbox';

// @codocs [[Chrome:Notion 블록]]
describe('Checkbox', () => {
  it('기본은 체크되지 않은 읽기 전용 표시다', () => {
    render(<Checkbox />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveAttribute('aria-readonly', 'true');
    expect(box.querySelector('svg')).toBeNull();
  });

  it('checked면 체크 표시를 그린다', () => {
    render(<Checkbox checked />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box.querySelector('svg')).not.toBeNull();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<Checkbox className="mt-8" />);
    expect(screen.getByRole('checkbox')).toHaveClass('mt-8');
  });
});
