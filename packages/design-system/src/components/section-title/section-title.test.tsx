import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionTitle } from './section-title';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SectionTitle', () => {
  it('기본 글자는 섹션 제목이다', () => {
    render(<SectionTitle />);
    expect(screen.getByText('섹션 제목')).toHaveClass('type-body-strong');
  });

  it('title로 글자를 바꾼다', () => {
    render(<SectionTitle title="고정됨" />);
    expect(screen.getByText('고정됨')).toBeInTheDocument();
  });

  it('showAction이 꺼져 있으면 action을 그리지 않는다', () => {
    render(<SectionTitle action={<button>보기</button>} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('showAction이 켜지면 action을 그린다', () => {
    render(<SectionTitle showAction action={<button>보기</button>} />);
    expect(screen.getByRole('button', { name: '보기' })).toBeInTheDocument();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<SectionTitle className="w-240" />);
    expect(container.firstChild).toHaveClass('w-240', 'flex');
  });
});
