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

  it('icon 슬롯을 받는다', () => {
    render(<FileRow icon={<i>아이콘</i>} />);
    expect(screen.getByText('아이콘')).toBeInTheDocument();
  });

  it('selected면 바탕을 깔고, 포커스까지 받으면 선을 그린다', () => {
    const { container, rerender } = render(<FileRow icon={<i />} selected />);
    expect(container.firstElementChild).toHaveClass('bg-file-item-explorer-fill-selected');
    expect(container.firstElementChild).not.toHaveClass('border-default');
    rerender(<FileRow icon={<i />} selected focused />);
    expect(container.firstElementChild).toHaveClass('border-default');
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
});
