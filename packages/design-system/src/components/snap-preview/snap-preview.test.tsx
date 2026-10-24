import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnapPreview } from './snap-preview';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SnapPreview', () => {
  it('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', () => {
    render(<SnapPreview role="presentation" aria-label="스냅 미리보기" />);
    expect(screen.getByRole('presentation', { name: '스냅 미리보기' })).toBeInTheDocument();
  });

  it('className으로 바깥 배치(크기)를 받는다', () => {
    render(<SnapPreview role="presentation" aria-label="스냅 미리보기" className="h-1016 w-952" />);
    expect(screen.getByLabelText('스냅 미리보기')).toHaveClass('h-1016', 'w-952');
  });

  // @codocs [[디자인 기반:재질 효과]]
  it('아크릴 재질 바탕을 건다', () => {
    render(<SnapPreview role="presentation" aria-label="스냅 미리보기" />);
    expect(screen.getByLabelText('스냅 미리보기')).toHaveClass(
      'material-acrylic-default',
      'surface-flyout-acrylic',
    );
  });
});
