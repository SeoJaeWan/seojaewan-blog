import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Flyout } from './flyout';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('Flyout', () => {
  it('내용을 children 자리(피그마 슬롯)에 그린다', () => {
    render(
      <Flyout>
        <p>메뉴 내용</p>
      </Flyout>,
    );
    expect(screen.getByText('메뉴 내용')).toBeInTheDocument();
  });

  it('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', () => {
    render(<Flyout role="dialog" aria-label="정렬 기준" material="solid" />);
    expect(screen.getByRole('dialog', { name: '정렬 기준' })).toBeInTheDocument();
  });
});
