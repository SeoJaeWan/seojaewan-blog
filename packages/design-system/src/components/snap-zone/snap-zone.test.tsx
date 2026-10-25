import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnapZone } from './snap-zone';

// @codocs [[컴포넌트 목록:상태]]
describe('SnapZone', () => {
  it('기본 칠과 선 토큰 클래스를 쓴다', () => {
    const { container } = render(<SnapZone />);
    expect(container.firstElementChild).toHaveClass(
      'h-56',
      'w-40',
      'rounded-control',
      'border-default',
      'border-control-stroke-default',
      'bg-control-alt-fill-secondary',
    );
  });

  it('Hover 상태는 강조색 클래스로 그린다', () => {
    const { container } = render(<SnapZone />);
    expect(container.firstElementChild).toHaveClass(
      'hover:bg-accent-fill-default',
      'hover:border-control-stroke-on-accent-default',
    );
  });
});
