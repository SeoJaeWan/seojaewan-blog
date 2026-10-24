import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Menu } from './menu';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Menu', () => {
  it('항목을 children 자리(Flyout Content 슬롯)에 그린다', () => {
    render(
      <Menu>
        <p>메뉴 항목</p>
      </Menu>,
    );
    expect(screen.getByText('메뉴 항목')).toBeInTheDocument();
  });

  it('Compact 여백의 Flyout 위에 메뉴 너비를 가진다', () => {
    render(<Menu role="menu" aria-label="메뉴" />);
    expect(screen.getByRole('menu', { name: '메뉴' })).toHaveClass('w-250', 'py-2');
  });

  it('material을 안쪽 Flyout에 넘긴다', () => {
    render(<Menu role="menu" aria-label="메뉴" material="solid" />);
    expect(screen.getByRole('menu', { name: '메뉴' })).toHaveClass('shadow-elevation-flyout');
  });
});
