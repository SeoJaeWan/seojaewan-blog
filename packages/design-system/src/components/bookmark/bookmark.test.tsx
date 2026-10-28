import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Bookmark } from './bookmark';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('Bookmark', () => {
  it('기본은 일반 문구를 그린다', () => {
    render(<Bookmark />);
    expect(screen.getByText('제목')).toHaveClass('type-body-strong');
    expect(screen.getByText('설명')).toHaveClass('type-caption');
    expect(screen.getByText('주소')).toBeInTheDocument();
  });

  it('title, description, url로 내용을 바꾼다', () => {
    render(<Bookmark title="글" description="소개" url="example.com" />);
    expect(screen.getByText('글')).toBeInTheDocument();
    expect(screen.getByText('소개')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<Bookmark className="w-720" />);
    expect(container.firstChild).toHaveClass('w-720', 'px-16');
  });
});
