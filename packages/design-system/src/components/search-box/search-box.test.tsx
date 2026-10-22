import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchBox } from './search-box';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('SearchBox', () => {
  it('접근성 이름을 갖는 검색 입력창이다', () => {
    render(<SearchBox aria-label="검색" placeholder="검색" />);
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveAttribute('placeholder', '검색');
  });

  it('입력하면 값이 바뀌고 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBox aria-label="검색" onChange={handleChange} />);

    await user.type(screen.getByRole('searchbox', { name: '검색' }), '리액트');

    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('리액트');
    expect(handleChange).toHaveBeenCalled();
  });

  it('Tab으로 입력창에 포커스를 옮긴다', async () => {
    const user = userEvent.setup();
    render(<SearchBox appearance="pill" aria-label="검색" />);

    await user.tab();

    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveFocus();
  });

  it('disabled면 입력할 수 없다', async () => {
    const user = userEvent.setup();
    render(<SearchBox aria-label="검색" disabled defaultValue="리액트" />);

    await user.type(screen.getByRole('searchbox', { name: '검색' }), '뷰');

    expect(screen.getByRole('searchbox', { name: '검색' })).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('리액트');
  });

  // @codocs [[피그마 일치 검사:짝짓기]]
  it('기본 모양의 아래쪽 선은 포커스와 disabled일 때만 그린다', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<SearchBox aria-label="검색" />);
    const selector = '[data-figma="bottom border"]';

    expect(container.querySelector(selector)).toBeNull();

    await user.tab();
    expect(container.querySelector(selector)).toHaveClass('bg-accent-fill-default');

    await user.tab();
    expect(container.querySelector(selector)).toBeNull();

    rerender(<SearchBox aria-label="검색" disabled />);
    expect(container.querySelector(selector)).toHaveClass('bg-control-stroke-default');
  });
});
