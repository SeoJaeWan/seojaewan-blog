import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressRing } from './progress-ring';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('ProgressRing', () => {
  it('진행 표시 역할과 쓰는 곳이 붙인 이름을 가진다', () => {
    render(<ProgressRing aria-label="불러오는 중" />);
    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toBeInTheDocument();
  });

  it('크기와 색조에 맞는 클래스로 호를 그린다', () => {
    const { container } = render(<ProgressRing tone="on-dark" size="64" />);
    const root = container.firstElementChild;
    expect(root).toHaveClass('size-64', 'text-boot-screen-foreground');
    expect(root?.querySelector('svg')).toHaveClass('size-64');
  });
});
