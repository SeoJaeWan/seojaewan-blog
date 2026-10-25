import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShellSurface } from './shell-surface';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ShellSurface', () => {
  it('내용을 children 자리(피그마 슬롯)에 그린다', () => {
    render(
      <ShellSurface>
        <p>Start 내용</p>
      </ShellSurface>,
    );
    expect(screen.getByText('Start 내용')).toBeInTheDocument();
  });

  it('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', () => {
    render(<ShellSurface role="dialog" aria-label="Start" material="solid" />);
    expect(screen.getByRole('dialog', { name: 'Start' })).toBeInTheDocument();
  });

  it('device로 크기와 모서리를 고른다', () => {
    render(<ShellSurface role="dialog" aria-label="검색" device="mobile" />);
    const surface = screen.getByRole('dialog', { name: '검색' });
    expect(surface).toHaveClass('w-390', 'h-640', 'rounded-b-none');
  });

  // @codocs [[디자인 기반:재질 효과]]
  it('material로 재질 바탕을 고른다', () => {
    render(<ShellSurface role="dialog" aria-label="재질" material="solid" />);
    expect(screen.getByRole('dialog', { name: '재질' })).toHaveClass(
      'bg-material-fallback-acrylic-base',
    );
  });
});
