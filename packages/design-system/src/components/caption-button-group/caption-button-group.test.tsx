import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CaptionButtonGroup } from './caption-button-group';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('CaptionButtonGroup', () => {
  it('normal이면 최소화·최대화·닫기 버튼을 그린다', () => {
    render(<CaptionButtonGroup />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      '최소화',
      '최대화',
      '닫기',
    ]);
  });

  it('snapped도 최대화 버튼을 그린다', () => {
    render(<CaptionButtonGroup placement="snapped" />);
    expect(screen.getByRole('button', { name: '최대화' })).toBeInTheDocument();
  });

  it('maximized면 최대화 자리에 복원 버튼을 그린다', () => {
    render(<CaptionButtonGroup placement="maximized" />);
    expect(screen.getByRole('button', { name: '이전 크기로 복원' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '최대화' })).not.toBeInTheDocument();
  });

  it('버튼을 누르면 해당 핸들러를 부른다', async () => {
    const user = userEvent.setup();
    const handleMinimize = vi.fn();
    const handleMaximize = vi.fn();
    const handleClose = vi.fn();
    render(
      <CaptionButtonGroup
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: '최소화' }));
    await user.click(screen.getByRole('button', { name: '최대화' }));
    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(handleMinimize).toHaveBeenCalledTimes(1);
    expect(handleMaximize).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('maximized에서 복원 버튼을 누르면 onRestore를 부른다', async () => {
    const user = userEvent.setup();
    const handleRestore = vi.fn();
    render(<CaptionButtonGroup placement="maximized" onRestore={handleRestore} />);

    await user.click(screen.getByRole('button', { name: '이전 크기로 복원' }));

    expect(handleRestore).toHaveBeenCalledTimes(1);
  });
});
