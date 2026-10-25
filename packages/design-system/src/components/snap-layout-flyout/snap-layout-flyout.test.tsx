import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnapLayoutFlyout } from './snap-layout-flyout';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SnapLayoutFlyout', () => {
  it('레이아웃 넷(칸 2+2+3+4개)을 그린다', () => {
    const { container } = render(<SnapLayoutFlyout />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(11);
  });

  it('className을 루트에 덧붙인다', () => {
    const { container } = render(<SnapLayoutFlyout className="m-8" />);
    expect(container.firstElementChild).toHaveClass('m-8', 'p-12', 'gap-12');
  });
});
