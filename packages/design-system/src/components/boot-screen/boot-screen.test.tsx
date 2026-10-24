import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BootScreen } from './boot-screen';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('BootScreen', () => {
  it('진행 링을 접근성 이름과 함께 그린다', () => {
    render(<BootScreen data-testid="boot" />);
    expect(screen.getByRole('progressbar', { name: '다시 시작하는 중' })).toBeInTheDocument();
  });

  it('기본은 desktop 크기다', () => {
    render(<BootScreen data-testid="boot" />);
    expect(screen.getByTestId('boot')).toHaveClass('w-1280', 'h-720', 'bg-boot-screen-background');
  });

  it('device로 화면 크기를 고른다', () => {
    render(<BootScreen device="mobile" data-testid="boot" />);
    expect(screen.getByTestId('boot')).toHaveClass('w-390', 'h-844');
  });
});
