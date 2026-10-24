import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NavigationItem } from './navigation-item';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('NavigationItem', () => {
  it('label을 글자로 보인다', () => {
    render(<NavigationItem label="문서" />);
    expect(screen.getByText('문서')).toBeInTheDocument();
  });

  it('expand가 none이면 펼침 상태를 알리지 않는다', () => {
    const { container } = render(<NavigationItem />);
    expect(container.firstElementChild).not.toHaveAttribute('aria-expanded');
  });

  it('expand에 따라 펼침 상태를 알린다', () => {
    const { container, rerender } = render(<NavigationItem expand="collapsed" />);
    expect(container.firstElementChild).toHaveAttribute('aria-expanded', 'false');
    rerender(<NavigationItem expand="expanded" />);
    expect(container.firstElementChild).toHaveAttribute('aria-expanded', 'true');
  });

  it('selected면 선택된 항목이다', () => {
    const { container } = render(<NavigationItem selected />);
    expect(container.firstElementChild).toHaveAttribute('aria-selected', 'true');
  });

  it('icon과 chevron 슬롯을 받는다', () => {
    render(<NavigationItem expand="collapsed" icon={<i>아이콘</i>} chevron={<i>꺾쇠</i>} />);
    expect(screen.getByText('아이콘')).toBeInTheDocument();
    expect(screen.getByText('꺾쇠')).toBeInTheDocument();
  });
});
