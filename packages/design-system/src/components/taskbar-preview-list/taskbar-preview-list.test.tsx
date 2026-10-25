import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TaskbarPreviewList } from './taskbar-preview-list';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('TaskbarPreviewList', () => {
  it('미리보기를 children 자리(피그마 슬롯)에 그린다', () => {
    render(
      <TaskbarPreviewList>
        <p>창 미리보기</p>
      </TaskbarPreviewList>,
    );
    expect(screen.getByText('창 미리보기')).toBeInTheDocument();
  });

  it('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', () => {
    render(<TaskbarPreviewList role="list" aria-label="창 미리보기 목록" />);
    expect(screen.getByRole('list', { name: '창 미리보기 목록' })).toBeInTheDocument();
  });

  // @codocs [[디자인 기반:재질 효과]]
  it('material로 재질 바탕을 고른다', () => {
    render(<TaskbarPreviewList role="list" aria-label="단색" material="solid" />);
    expect(screen.getByRole('list', { name: '단색' })).toHaveClass(
      'bg-material-fallback-acrylic-base',
    );
  });
});
