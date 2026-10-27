import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPortal } from 'react-dom';
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

  it('maximizeSlot을 기본 최대화 버튼 대신 그린다', () => {
    render(<WindowFrame appIcon={null} maximizeSlot={<button type="button">스냅</button>} />);
    expect(screen.getByRole('button', { name: '스냅' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '최대화' })).not.toBeInTheDocument();
  });

  it('제목 표시줄을 더블클릭하면 onTitleBarDoubleClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleDoubleClick = vi.fn();
    render(
      <WindowFrame appIcon={null} title="파일 탐색기" onTitleBarDoubleClick={handleDoubleClick} />,
    );
    await user.dblClick(screen.getByText('파일 탐색기'));
    expect(handleDoubleClick).toHaveBeenCalledOnce();
  });

  it('custom 제목 표시줄 내용 위 더블클릭도 부른다', async () => {
    const user = userEvent.setup();
    const handleDoubleClick = vi.fn();
    render(
      <WindowFrame
        titleBar="custom"
        titleBarContent={<i data-testid="tabs" />}
        onTitleBarDoubleClick={handleDoubleClick}
      />,
    );
    await user.dblClick(screen.getByTestId('tabs'));
    expect(handleDoubleClick).toHaveBeenCalledOnce();
  });

  it('창 버튼 위 더블클릭은 무시한다', async () => {
    const user = userEvent.setup();
    const handleDoubleClick = vi.fn();
    const handleMaximize = vi.fn();
    render(
      <WindowFrame
        appIcon={null}
        onMaximize={handleMaximize}
        onTitleBarDoubleClick={handleDoubleClick}
      />,
    );
    await user.dblClick(screen.getByRole('button', { name: '최대화' }));
    expect(handleDoubleClick).not.toHaveBeenCalled();
    expect(handleMaximize).toHaveBeenCalledTimes(2);
  });

  it('창 버튼 자리에서 포털로 그린 팝업을 더블클릭한 것은 onTitleBarDoubleClick을 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleDoubleClick = vi.fn();
    render(
      <WindowFrame
        appIcon={null}
        onTitleBarDoubleClick={handleDoubleClick}
        maximizeSlot={createPortal(<p>스냅 레이아웃</p>, document.body)}
      />,
    );
    await user.dblClick(screen.getByText('스냅 레이아웃'));
    expect(handleDoubleClick).not.toHaveBeenCalled();
  });

  it('제목 표시줄을 누르면 onTitleBarPointerDown을 부른다', async () => {
    const user = userEvent.setup();
    const handlePointerDown = vi.fn();
    render(
      <WindowFrame appIcon={null} title="파일 탐색기" onTitleBarPointerDown={handlePointerDown} />,
    );
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByText('파일 탐색기') });
    expect(handlePointerDown).toHaveBeenCalledOnce();
  });

  it('창 버튼 위에서 누른 것은 onTitleBarPointerDown을 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handlePointerDown = vi.fn();
    render(<WindowFrame appIcon={null} onTitleBarPointerDown={handlePointerDown} />);
    await user.click(screen.getByRole('button', { name: '최소화' }));
    expect(handlePointerDown).not.toHaveBeenCalled();
  });

  it('창 버튼 자리에서 포털로 그린 팝업을 누른 것은 onTitleBarPointerDown을 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handlePointerDown = vi.fn();
    render(
      <WindowFrame
        appIcon={null}
        onTitleBarPointerDown={handlePointerDown}
        maximizeSlot={createPortal(<p>스냅 레이아웃</p>, document.body)}
      />,
    );
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByText('스냅 레이아웃') });
    expect(handlePointerDown).not.toHaveBeenCalled();
  });

  it('내용 자리를 더블클릭해도 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleDoubleClick = vi.fn();
    render(
      <WindowFrame appIcon={null} onTitleBarDoubleClick={handleDoubleClick}>
        <p>내용</p>
      </WindowFrame>,
    );
    await user.dblClick(screen.getByText('내용'));
    expect(handleDoubleClick).not.toHaveBeenCalled();
  });
});
