import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NavigationPane } from './navigation-pane';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('NavigationPane', () => {
  it('items 슬롯에 children을 담고 바깥 틀을 잘라 낸다', () => {
    render(
      <NavigationPane data-testid="pane">
        <span>항목</span>
      </NavigationPane>,
    );
    const pane = screen.getByTestId('pane');
    expect(pane).toHaveClass('overflow-clip', 'px-4', 'py-8');
    expect(screen.getByText('항목').parentElement?.parentElement).toBe(pane);
  });

  it('너비를 갖지 않고 className을 받는다', () => {
    render(<NavigationPane className="w-240" data-testid="pane" />);
    expect(screen.getByTestId('pane')).toHaveClass('w-240');
  });
});
