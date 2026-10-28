import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Quote } from './quote';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Quote', () => {
  it('슬롯을 채운다', () => {
    render(
      <Quote>
        <p>인용 글</p>
      </Quote>,
    );
    expect(screen.getByText('인용 글')).toBeInTheDocument();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<Quote className="mt-8" data-testid="quote" />);
    expect(screen.getByTestId('quote')).toHaveClass('mt-8');
  });
});
