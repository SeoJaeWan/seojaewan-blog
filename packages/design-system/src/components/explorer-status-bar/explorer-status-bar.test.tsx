import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExplorerStatusBar } from './explorer-status-bar';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('ExplorerStatusBar', () => {
  it('항목 수와 선택 정보를 글자로 보인다', () => {
    render(<ExplorerStatusBar itemCount="3개 항목" selection="1개 선택" />);
    expect(screen.getByText('3개 항목')).toBeInTheDocument();
    expect(screen.getByText('1개 선택')).toBeInTheDocument();
  });

  it('showSelection이 false면 선택 정보를 그리지 않는다', () => {
    render(<ExplorerStatusBar selection="1개 선택" showSelection={false} />);
    expect(screen.queryByText('1개 선택')).not.toBeInTheDocument();
  });

  it('desktop은 보기 전환 버튼을 그리고 누르면 콜백을 부른다', async () => {
    const user = userEvent.setup();
    const handleDetails = vi.fn();
    const handleLarge = vi.fn();
    render(<ExplorerStatusBar onDetailsView={handleDetails} onLargeIconsView={handleLarge} />);

    await user.click(screen.getByRole('button', { name: '자세히' }));
    await user.click(screen.getByRole('button', { name: '큰 아이콘' }));

    expect(handleDetails).toHaveBeenCalledTimes(1);
    expect(handleLarge).toHaveBeenCalledTimes(1);
  });

  it('mobile은 보기 전환 버튼을 그리지 않는다', () => {
    render(<ExplorerStatusBar device="mobile" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
