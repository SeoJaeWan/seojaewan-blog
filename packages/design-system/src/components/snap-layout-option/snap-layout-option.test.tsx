import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnapLayoutOption } from './snap-layout-option';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SnapLayoutOption', () => {
  it.each([
    ['half', 2],
    ['twothirds', 2],
    ['halfquarter', 3],
    ['quad', 4],
  ] as const)('%s는 칸을 %i개 그린다', (layout, count) => {
    const { container } = render(<SnapLayoutOption layout={layout} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(count);
  });

  it('기본값은 half다', () => {
    const { container } = render(<SnapLayoutOption />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('twothirds는 왼쪽 열이 고정 너비 56이다', () => {
    const { container } = render(<SnapLayoutOption layout="twothirds" />);
    expect(container.firstElementChild?.firstElementChild).toHaveClass('w-56', 'shrink-0');
  });

  it('className을 루트에 덧붙인다', () => {
    const { container } = render(<SnapLayoutOption className="m-8" />);
    expect(container.firstElementChild).toHaveClass('m-8', 'w-88', 'h-56');
  });
});
