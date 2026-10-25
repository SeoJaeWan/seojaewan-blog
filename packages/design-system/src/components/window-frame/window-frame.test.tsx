import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WindowFrame } from './window-frame';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('WindowFrame', () => {
  it('기본 제목 표시줄은 앱 아이콘, 창 제목과 창 버튼을 그린다', () => {
    render(<WindowFrame appIcon={<i data-testid="icon" />} title="파일 탐색기" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('파일 탐색기')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      '최소화',
      '최대화',
      '닫기',
    ]);
  });

  it('custom 제목 표시줄은 titleBarContent를 그리고 창 제목을 그리지 않는다', () => {
    render(<WindowFrame titleBar="custom" titleBarContent={<i data-testid="tabs" />} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.queryByText('창 제목')).not.toBeInTheDocument();
  });

  it('children을 내용 자리에 그린다', () => {
    render(
      <WindowFrame appIcon={null}>
        <p>내용</p>
      </WindowFrame>,
    );
    expect(screen.getByText('내용')).toBeInTheDocument();
  });

  it('떠 있는 창만 모서리, 테두리와 그림자를 갖는다', () => {
    const { container, rerender } = render(<WindowFrame appIcon={null} material="solid" />);
    expect(container.firstChild).toHaveClass(
      'rounded-overlay',
      'border-default',
      'shadow-elevation-window-active',
    );

    rerender(<WindowFrame appIcon={null} material="solid" placement="maximized" />);
    expect(container.firstChild).not.toHaveClass('rounded-overlay', 'border-default');
    expect(container.firstChild).not.toHaveClass('shadow-elevation-window-active');
  });

  it('재질과 상태에 따라 바탕과 효과가 다르다', () => {
    const { container, rerender } = render(<WindowFrame appIcon={null} inactive />);
    expect(container.firstChild).toHaveClass('material-mica-base', 'surface-window-inactive-mica');

    rerender(<WindowFrame appIcon={null} material="chrome" />);
    expect(container.firstChild).toHaveClass('bg-chrome-frame-fill');
  });

  it('inactive면 제목을 흐리게 그린다', () => {
    render(<WindowFrame appIcon={null} inactive />);
    expect(screen.getByText('창 제목')).toHaveClass('text-text-fill-tertiary');
  });

  it('maximized면 복원 버튼을 그리고 창 버튼 핸들러를 넘긴다', async () => {
    const user = userEvent.setup();
    const handleRestore = vi.fn();
    const handleClose = vi.fn();
    render(
      <WindowFrame
        appIcon={null}
        placement="maximized"
        onRestore={handleRestore}
        onClose={handleClose}
      />,
    );
    await user.click(screen.getByRole('button', { name: '이전 크기로 복원' }));
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(handleRestore).toHaveBeenCalledOnce();
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<WindowFrame appIcon={null} className="h-500 w-800" />);
    expect(container.firstChild).toHaveClass('h-500', 'w-800', 'flex');
  });

  it('showMaximize가 false면 창 버튼에서 최대화 버튼을 뺀다', () => {
    render(<WindowFrame appIcon={null} showMaximize={false} />);
    expect(screen.queryByRole('button', { name: '최대화' })).not.toBeInTheDocument();
  });
});
