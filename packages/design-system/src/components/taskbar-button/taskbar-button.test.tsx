import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskbarButton } from './taskbar-button';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('TaskbarButton', () => {
  it('label을 접근성 이름으로 갖는 버튼이다', () => {
    render(<TaskbarButton label="파일 탐색기" />);
    expect(screen.getByRole('button', { name: '파일 탐색기' })).toBeInTheDocument();
  });

  it('누르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<TaskbarButton label="파일 탐색기" onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: '파일 탐색기' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('indicator가 none이면 표시줄을 그리지 않고 running·active면 그린다', () => {
    const { container, rerender } = render(<TaskbarButton label="앱" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    rerender(<TaskbarButton label="앱" indicator="running" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();

    rerender(<TaskbarButton label="앱" indicator="active" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('icon을 주면 앱 아이콘 대신 그 아이콘을 그린다', () => {
    render(<TaskbarButton label="앱" icon={<svg data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
