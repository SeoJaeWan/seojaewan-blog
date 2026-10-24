import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './tooltip';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('Tooltip', () => {
  it('글자를 담은 tooltip 역할 요소다', () => {
    render(<Tooltip text="도움말" />);
    expect(screen.getByRole('tooltip')).toHaveTextContent('도움말');
  });

  it('material로 바탕의 재질을 고른다', () => {
    render(<Tooltip text="도움말" material="solid" />);
    expect(screen.getByRole('tooltip')).toHaveClass('bg-material-fallback-acrylic-default');
  });

  it('balloon은 글자 앞에 아이콘을 그리고 id 같은 div 속성을 넘긴다', () => {
    render(<Tooltip type="balloon" text="메시지 내용" id="tip" />);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('id', 'tip');
    expect(tooltip).toHaveTextContent('메시지 내용');
    expect(tooltip.querySelector('svg')).toBeInTheDocument();
  });
});
