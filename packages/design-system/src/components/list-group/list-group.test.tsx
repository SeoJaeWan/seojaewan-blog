import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
    expect(screen.getByTestId('group')).toHaveClass('gap-2');
  });

  it('label을 머리글 글자로 그리고, 항목 사이에 간격 2를 둔다', () => {
    render(
      <ListGroup label="최근">
        <span>항목</span>
      </ListGroup>,
    );
    expect(screen.getByText('최근')).toBeInTheDocument();
    expect(screen.getByText('항목').parentElement).toHaveClass('gap-2');
  });

  it('showHeader가 false면 머리글을 그리지 않는다', () => {
    render(<ListGroup showHeader={false} />);
    expect(screen.queryByText('머리글')).not.toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    render(<ListGroup className="mt-8" data-testid="group" />);
    expect(screen.getByTestId('group')).toHaveClass('mt-8', 'flex-col');
  });

  it('onHeaderClick이 없으면 머리글은 버튼이 아니다', () => {
    render(<ListGroup label="최근" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('onHeaderClick이 있으면 머리글이 버튼이 되고, 누르면 부른다', async () => {
    const user = userEvent.setup();
    const handleHeaderClick = vi.fn();
    render(
      <ListGroup label="최근" onHeaderClick={handleHeaderClick}>
        <span>항목</span>
      </ListGroup>,
    );
    await user.click(screen.getByRole('button', { name: '최근' }));
    expect(handleHeaderClick).toHaveBeenCalledOnce();
  });
});
