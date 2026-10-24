import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostNavCard } from './post-nav-card';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('PostNavCard', () => {
  it('기본은 이전 글 라벨과 일반 제목이다', () => {
    render(<PostNavCard />);
    expect(screen.getByText('이전 글')).toBeInTheDocument();
    expect(screen.getByText('글 제목')).toHaveClass('type-body-strong');
  });

  it('prev는 왼쪽 정렬이다', () => {
    const { container } = render(<PostNavCard direction="prev" />);
    expect(container.firstChild).toHaveClass('items-start');
  });

  it('next는 다음 글 라벨과 오른쪽 정렬이다', () => {
    const { container } = render(<PostNavCard direction="next" />);
    expect(screen.getByText('다음 글')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('items-end');
  });

  it('title로 제목을 바꾼다', () => {
    render(<PostNavCard title="다른 글" />);
    expect(screen.getByText('다른 글')).toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<PostNavCard className="w-354" />);
    expect(container.firstChild).toHaveClass('w-354', 'px-16');
  });
});
