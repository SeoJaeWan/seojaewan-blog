import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Equation } from './equation';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Equation', () => {
  it('슬롯은 비어 있다', () => {
    const { container } = render(<Equation />);
    expect(container.firstElementChild).toBeEmptyDOMElement();
  });

  it('children으로 받은 수식을 그린다', () => {
    render(
      <Equation>
        <span>x = 1</span>
      </Equation>,
    );
    expect(screen.getByText('x = 1')).toBeInTheDocument();
  });
});
