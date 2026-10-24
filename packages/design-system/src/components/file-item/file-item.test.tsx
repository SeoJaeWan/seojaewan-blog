import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileItem } from './file-item';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('FileItem', () => {
  it('기본 이름은 파일 이름이다', () => {
    render(<FileItem />);
    expect(screen.getByText('파일 이름')).toBeInTheDocument();
  });

  it('icon을 주면 폴더 아이콘 대신 그 아이콘을 그린다', () => {
    const { container } = render(<FileItem icon={<svg data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renaming이면 이름 대신 이름 바꾸기 상자를 그린다', () => {
    const { container } = render(<FileItem renaming name="문서" />);
    expect(screen.getByText('문서').className).toContain('text-on-accent');
    expect(container.querySelector('.line-clamp-2')).toBeNull();
  });

  it('선택하면 이름을 줄이지 않고, 선택하지 않으면 두 줄까지만 보인다', () => {
    const { rerender } = render(<FileItem name="긴 이름" />);
    expect(screen.getByText('긴 이름').className).toContain('line-clamp-2');
    rerender(<FileItem name="긴 이름" selected />);
    expect(screen.getByText('긴 이름').className).not.toContain('line-clamp-2');
  });

  it('선택된 채 포커스를 받을 때만 선을 그린다', () => {
    const { container, rerender } = render(<FileItem focused />);
    expect((container.firstChild as HTMLElement).className).not.toContain('border-default');
    rerender(<FileItem selected focused />);
    expect((container.firstChild as HTMLElement).className).toContain('border-default');
  });

  it('cut이면 아이콘과 이름을 흐리게 그린다', () => {
    const { container } = render(<FileItem cut />);
    expect(container.querySelectorAll('.opacity-cut')).toHaveLength(2);
  });
});
