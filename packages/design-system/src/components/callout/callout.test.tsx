import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Callout } from './callout';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Callout', () => {
  it('아이콘과 슬롯을 채운다', () => {
    render(
      <Callout icon={<span>아이콘</span>}>
        <p>본문</p>
      </Callout>,
    );
    expect(screen.getByText('아이콘')).toBeInTheDocument();
    expect(screen.getByText('본문')).toBeInTheDocument();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<Callout icon={null} className="mt-8" data-testid="callout" />);
    expect(screen.getByTestId('callout')).toHaveClass('mt-8');
  });
});
