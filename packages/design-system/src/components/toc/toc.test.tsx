import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toc } from './toc';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Toc', () => {
  it('펼치면 제목과 Items 슬롯의 children을 보인다', () => {
    render(
      <Toc data-testid="toc">
        <span>항목</span>
      </Toc>,
    );
    expect(screen.getByText('목차')).toBeInTheDocument();
    expect(screen.getByText('항목')).toBeInTheDocument();
  });

  it('접으면 제목과 꺾쇠만 보이고 children은 그리지 않는다', () => {
    const { container } = render(
      <Toc state="collapsed">
        <span>항목</span>
      </Toc>,
    );
    expect(screen.getByText('목차')).toBeInTheDocument();
    expect(screen.queryByText('항목')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('제목을 바꾸고 너비 없이 className을 받는다', () => {
    render(<Toc title="이 글의 목차" className="w-220" data-testid="toc" />);
    expect(screen.getByText('이 글의 목차')).toBeInTheDocument();
    expect(screen.getByTestId('toc')).toHaveClass('w-220');
  });

  it('펼친 상태의 제목은 titleProps의 동작·접근성 속성을 받는다', () => {
    render(<Toc titleProps={{ role: 'button', tabIndex: 0, 'aria-expanded': true }} />);
    expect(screen.getByRole('button', { name: '목차' })).toHaveAttribute('aria-expanded', 'true');
  });
});
