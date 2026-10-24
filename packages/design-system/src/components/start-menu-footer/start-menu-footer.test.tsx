import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StartMenuFooter } from './start-menu-footer';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('StartMenuFooter', () => {
  it('children을 content 슬롯에 그리고 위쪽 선을 둔다', () => {
    render(
      <StartMenuFooter data-testid="footer">
        <span>내용</span>
      </StartMenuFooter>,
    );
    expect(screen.getByTestId('footer')).toHaveClass('border-t-default', 'px-48', 'py-16');
    expect(screen.getByText('내용')).toBeInTheDocument();
  });

  it('슬롯은 기본으로 비어 있고 너비를 갖지 않는다', () => {
    render(<StartMenuFooter data-testid="footer" />);
    const footer = screen.getByTestId('footer');
    expect(footer.firstElementChild).toBeEmptyDOMElement();
    expect(footer.className).not.toMatch(/(^|\s)w-/);
  });
});
