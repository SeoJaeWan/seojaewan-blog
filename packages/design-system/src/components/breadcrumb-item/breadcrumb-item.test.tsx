import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BreadcrumbItem } from './breadcrumb-item';

// @codocs [[컴포넌트 목록:상태]]
describe('BreadcrumbItem', () => {
  it('기본은 위치 이름 글자와 구분자를 그리고 현재 위치가 아니다', () => {
    const { container } = render(<BreadcrumbItem />);
    const button = screen.getByRole('button', { name: '위치 이름' });
    expect(button).not.toHaveAttribute('aria-current');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('current는 aria-current를 붙이고 showSeparator를 끄면 구분자가 없다', () => {
    const { container } = render(<BreadcrumbItem label="문서" current showSeparator={false} />);
    expect(screen.getByRole('button', { name: '문서' })).toHaveAttribute('aria-current', 'page');
    expect(container.querySelector('svg')).toBeNull();
  });
});
