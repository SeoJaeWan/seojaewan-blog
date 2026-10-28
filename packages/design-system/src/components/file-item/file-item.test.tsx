import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileItem } from './file-item';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
const icon = <svg data-testid="icon" />;

describe('FileItem', () => {
  it('기본 이름은 파일 이름이다', () => {
    render(<FileItem icon={icon} />);
    expect(screen.getByText('파일 이름')).toBeInTheDocument();
  });

  it('icon을 아이콘 칸에 그린다', () => {
    render(<FileItem icon={icon} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renaming이면 이름 대신 name을 처음 값으로 가진 입력창을 그린다', () => {
    const { container } = render(<FileItem icon={icon} renaming name="문서" />);
    expect(screen.getByRole('textbox')).toHaveValue('문서');
    expect(screen.queryByText('문서')).toBeNull();
    expect(container.querySelector('.line-clamp-2')).toBeNull();
  });

  it('renameFieldProps를 이름 바꾸기 입력창에 넘긴다', () => {
    render(
      <FileItem icon={icon} renaming name="문서" renameFieldProps={{ 'aria-label': '새 이름' }} />,
    );
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('문서');
  });

  it('탐색기에서 이름을 바꾸면 선택 바탕을 깔고, 바탕화면에서는 깔지 않는다', () => {
    const { container, rerender } = render(<FileItem icon={icon} surface="explorer" renaming />);
    expect((container.firstChild as HTMLElement).className).toContain(
      'bg-file-item-explorer-fill-selected',
    );
    rerender(<FileItem icon={icon} surface="desktop" renaming />);
    expect((container.firstChild as HTMLElement).className).not.toContain('fill-selected');
  });

  it('선택하면 이름을 줄이지 않고, 선택하지 않으면 두 줄까지만 보인다', () => {
    const { rerender } = render(<FileItem icon={icon} name="긴 이름" />);
    expect(screen.getByText('긴 이름').className).toContain('line-clamp-2');
    rerender(<FileItem icon={icon} name="긴 이름" selected />);
    expect(screen.getByText('긴 이름').className).not.toContain('line-clamp-2');
  });

  // @codocs [[컴포넌트 목록:상태]]
  it('focused면 선택과 상관없이 크기에 넣지 않는 안쪽 선을 그린다', () => {
    const { container, rerender } = render(<FileItem icon={icon} />);
    expect((container.firstChild as HTMLElement).className).not.toContain('inner-border-w-default');
    rerender(<FileItem icon={icon} focused />);
    const { className } = container.firstChild as HTMLElement;
    expect(className).toContain('inner-border-file-item-desktop-stroke-focus');
    expect(className.split(' ')).not.toContain('border-default');
  });

  it('cut이면 아이콘과 이름을 흐리게 그린다', () => {
    const { container } = render(<FileItem icon={icon} cut />);
    expect(container.querySelectorAll('.opacity-cut')).toHaveLength(2);
  });
});
