import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TocItem } from './toc-item';

// @codocs [[컴포넌트 목록:상태]]
describe('TocItem', () => {
  it('기본 글자는 목차 항목이고 활성이 아니다', () => {
    const { container } = render(<TocItem />);
    expect(screen.getByText('목차 항목')).toHaveClass('text-text-fill-secondary');
    expect(container.firstChild).not.toHaveAttribute('aria-current');
    expect(container.firstElementChild?.firstElementChild).toHaveClass('bg-divider-stroke-default');
  });

  it('active이면 강조색 표시줄과 글자로 바뀌고 aria-current가 붙는다', () => {
    const { container } = render(<TocItem active label="소개" />);
    expect(screen.getByText('소개')).toHaveClass('text-accent-text-fill-primary');
    expect(container.firstChild).toHaveAttribute('aria-current', 'location');
    expect(container.firstElementChild?.firstElementChild).toHaveClass('bg-accent-fill-default');
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<TocItem className="w-240" />);
    expect(container.firstChild).toHaveClass('w-240', 'flex');
  });
});
