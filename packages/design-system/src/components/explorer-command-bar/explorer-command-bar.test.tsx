import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExplorerCommandBar } from './explorer-command-bar';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ExplorerCommandBar', () => {
  it('children을 Commands 슬롯에 그린다', () => {
    render(
      <ExplorerCommandBar data-testid="bar">
        <span>명령</span>
      </ExplorerCommandBar>,
    );
    expect(screen.getByTestId('bar')).toHaveClass('gap-4', 'px-12', 'py-8');
    expect(screen.getByText('명령')).toBeInTheDocument();
  });

  it('슬롯은 기본으로 비어 있고 너비를 갖지 않는다', () => {
    render(<ExplorerCommandBar data-testid="bar" />);
    const bar = screen.getByTestId('bar');
    expect(bar.firstElementChild).toBeEmptyDOMElement();
    expect(bar.className).not.toMatch(/(^|\s)w-/);
  });
});
