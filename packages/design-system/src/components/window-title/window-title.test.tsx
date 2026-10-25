import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WindowTitle } from './window-title';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('WindowTitle', () => {
  it('기본 글자는 창 제목이고 앱 아이콘을 그린다', () => {
    render(<WindowTitle appIcon={<i data-testid="icon" />} />);
    expect(screen.getByText('창 제목')).toHaveClass('type-caption');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('title로 글자를 바꾼다', () => {
    render(<WindowTitle appIcon={null} title="파일 탐색기" />);
    expect(screen.getByText('파일 탐색기')).toBeInTheDocument();
  });

  it('kind에 따라 간격과 여백이 다르다', () => {
    const { container, rerender } = render(<WindowTitle appIcon={null} />);
    expect(container.firstChild).toHaveClass('gap-12', 'pl-16', 'py-8');

    rerender(<WindowTitle appIcon={null} kind="preview" />);
    expect(container.firstChild).toHaveClass('gap-8', 'p-0');
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<WindowTitle appIcon={null} className="w-240" />);
    expect(container.firstChild).toHaveClass('w-240', 'flex');
  });
});
