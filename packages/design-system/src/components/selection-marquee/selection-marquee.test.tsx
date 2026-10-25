import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectionMarquee } from './selection-marquee';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('SelectionMarquee', () => {
  it('선택 사각형 토큰 클래스를 쓴다', () => {
    const { container } = render(<SelectionMarquee />);
    expect(container.firstElementChild).toHaveClass(
      'border-default',
      'border-selection-marquee-stroke',
      'bg-selection-marquee-fill',
    );
  });

  it('크기는 className으로 받는다', () => {
    const { container } = render(<SelectionMarquee className="h-160 w-240" />);
    expect(container.firstElementChild).toHaveClass('h-160', 'w-240');
  });
});
