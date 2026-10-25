import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Taskbar } from './taskbar';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Taskbar', () => {
  it('슬롯을 채우지 않으면 안쪽 부품을 그리지 않는다', () => {
    render(<Taskbar />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('center와 right 자리에 넣은 내용을 그린다', () => {
    render(
      <Taskbar
        center={<button type="button">시작</button>}
        right={<button type="button">시계</button>}
      />,
    );
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시계' })).toBeInTheDocument();
  });
});
