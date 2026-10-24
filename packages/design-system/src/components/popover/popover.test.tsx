import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Popover } from './popover';

// @codocs [[디자인 시스템:팝업]]
describe('Popover', () => {
  it('닫혀 있으면 트리거만 그린다', () => {
    render(<Popover trigger={<button type="button">열기</button>} popup={<p>팝업 내용</p>} />);
    expect(screen.getByRole('button', { name: '열기' })).toBeInTheDocument();
    expect(screen.queryByText('팝업 내용')).not.toBeInTheDocument();
  });

  it('열려 있으면 팝업을 트리거 옆에 절대 위치로 그린다', () => {
    render(<Popover open trigger={<button type="button">열기</button>} popup={<p>팝업 내용</p>} />);
    const popup = screen.getByText('팝업 내용').parentElement;
    expect(popup).toHaveClass('absolute', 'top-full', 'left-0', 'mt-4');
  });

  it('placement로 팝업이 붙는 자리를 고른다', () => {
    render(
      <Popover
        open
        placement="top-end"
        trigger={<button type="button">열기</button>}
        popup={<p>팝업 내용</p>}
      />,
    );
    expect(screen.getByText('팝업 내용').parentElement).toHaveClass(
      'bottom-full',
      'right-0',
      'mb-4',
    );
  });
});
