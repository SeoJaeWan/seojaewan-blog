import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileRow } from './file-row';

// @codocs [[컴포넌트 목록:상태]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('FileRow', () => {
  it('기본 글자를 그린다', () => {
    render(<FileRow icon={<i />} />);
    expect(screen.getByText('파일 이름')).toBeInTheDocument();
    expect(screen.getByText('수정한 날짜')).toBeInTheDocument();
    expect(screen.getByText('유형')).toBeInTheDocument();
  });

  it('위치 칸은 showLocation일 때만 보인다', () => {
    const { rerender } = render(<FileRow icon={<i />} />);
    expect(screen.queryByText('위치')).toBeNull();
    rerender(<FileRow icon={<i />} showLocation />);
    expect(screen.getByText('위치')).toBeInTheDocument();
  });

  it('recycle-bin 보기는 원래 위치와 삭제한 날짜 칸을 그린다', () => {
    render(<FileRow icon={<i />} view="recycle-bin" showLocation />);
    expect(screen.getByText('원래 위치')).toBeInTheDocument();
    expect(screen.getByText('삭제한 날짜')).toBeInTheDocument();
    expect(screen.queryByText('수정한 날짜')).toBeNull();
    expect(screen.queryByText('유형')).toBeNull();
    expect(screen.queryByText('위치')).toBeNull();
  });

  it('icon 슬롯을 받는다', () => {
    render(<FileRow icon={<i>아이콘</i>} />);
    expect(screen.getByText('아이콘')).toBeInTheDocument();
  });

  it('selected면 바탕을 깐다', () => {
    const { container } = render(<FileRow icon={<i />} selected />);
    expect(container.firstElementChild).toHaveClass('bg-file-item-explorer-fill-selected');
  });

  it('포커스 선은 prop 없이 키보드 포커스(:focus-visible)일 때만 크기에 넣지 않는 안쪽 선으로 그린다', () => {
    const { container } = render(<FileRow icon={<i />} />);
    expect(container.firstElementChild).toHaveClass(
      'focus-visible:inner-border-file-item-explorer-stroke-focus',
      'focus-visible:inner-border-w-default',
      'outline-none',
    );
    const classes = container.firstElementChild?.className.split(' ') ?? [];
    expect(classes.filter((name) => name.startsWith('inner-border'))).toEqual([]);
    expect(container.firstElementChild).not.toHaveClass('border-default');
  });

  it('포커스 선은 선택과 상관없이 같다', () => {
    const { container } = render(<FileRow icon={<i />} selected />);
    expect(container.firstElementChild).toHaveClass(
      'focus-visible:inner-border-file-item-explorer-stroke-focus',
    );
  });

  it('cut이면 아이콘과 이름을 흐리게 그린다', () => {
    render(<FileRow icon={<i>아이콘</i>} cut />);
    expect(screen.getByText('파일 이름')).toHaveClass('opacity-cut');
    expect(screen.getByText('아이콘').parentElement).toHaveClass('opacity-cut');
  });

  it('renaming이면 이름 대신 입력 상자를 이름으로 채워 그린다', () => {
    render(<FileRow icon={<i />} name="보고서" renaming />);
    expect(screen.getByRole('textbox', { name: '이름 바꾸기' })).toHaveValue('보고서');
    expect(screen.queryByText('보고서')).toBeNull();
  });

  it('renameFieldProps를 이름 바꾸기 입력창에 넘긴다', () => {
    render(
      <FileRow icon={<i />} renaming name="문서" renameFieldProps={{ 'aria-label': '새 이름' }} />,
    );
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('문서');
  });
});
