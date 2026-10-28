import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './toggle';

// @codocs [[Chrome:Notion 블록]]
describe('Toggle', () => {
  it('기본은 접혀 있고 내용을 그리지 않는다', () => {
    render(
      <Toggle title="자세히">
        <p>본문</p>
      </Toggle>,
    );
    expect(screen.getByRole('button', { name: '자세히' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('본문')).not.toBeInTheDocument();
  });

  it('제목 줄을 누르면 비제어로 펼치고 접는다', async () => {
    const user = userEvent.setup();
    render(
      <Toggle title="자세히">
        <p>본문</p>
      </Toggle>,
    );
    const button = screen.getByRole('button', { name: '자세히' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', screen.getByText('본문').parentElement?.id);
    await user.click(button);
    expect(screen.queryByText('본문')).not.toBeInTheDocument();
  });

  it('defaultExpanded로 펼친 채 시작한다', () => {
    render(
      <Toggle defaultExpanded>
        <p>본문</p>
      </Toggle>,
    );
    expect(screen.getByText('본문')).toBeInTheDocument();
    expect(screen.getByText('제목')).toBeInTheDocument();
  });

  it('isExpanded를 주면 제어 모드라 누르기를 알리기만 한다', async () => {
    const user = userEvent.setup();
    const handleExpandedChange = vi.fn();
    render(
      <Toggle isExpanded={false} onExpandedChange={handleExpandedChange}>
        <p>본문</p>
      </Toggle>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('본문')).not.toBeInTheDocument();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<Toggle className="mt-8" data-testid="toggle" />);
    expect(screen.getByTestId('toggle')).toHaveClass('mt-8');
  });
});
