import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListGroup } from './list-group';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ListGroup', () => {
  it('머리글과 items 슬롯을 그린다', () => {
    render(
      <ListGroup data-testid="group">
        <span>항목</span>
      </ListGroup>,
    );
    expect(screen.getByText('머리글')).toBeInTheDocument();
    expect(screen.getByText('항목')).toBeInTheDocument();
    expect(screen.getByTestId('group')).toHaveClass('w-574', 'gap-2');
  });

  it('showHeader가 false면 머리글을 그리지 않는다', () => {
    render(<ListGroup showHeader={false} />);
    expect(screen.queryByText('머리글')).not.toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    render(<ListGroup className="mt-8" data-testid="group" />);
    expect(screen.getByTestId('group')).toHaveClass('mt-8', 'flex-col');
  });
});
