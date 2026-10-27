import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DetailsHeader } from './details-header';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('DetailsHeader', () => {
  it('기본은 이름·수정한 날짜·유형 열이고 위치 열은 없다', () => {
    render(<DetailsHeader />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '이름',
      '수정한 날짜',
      '유형',
    ]);
  });

  it('showLocation이면 위치 열을 더한다', () => {
    render(<DetailsHeader showLocation />);
    expect(screen.getByRole('button', { name: '위치' })).toBeInTheDocument();
  });

  it('휴지통 보기는 이름·원래 위치·삭제한 날짜 열이고 showLocation을 따르지 않는다', () => {
    render(<DetailsHeader view="recycle-bin" showLocation />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '이름',
      '원래 위치',
      '삭제한 날짜',
    ]);
  });

  it('휴지통 보기에서 열 제목을 누르면 그 열을 알린다', () => {
    const handleSort = vi.fn();
    render(<DetailsHeader view="recycle-bin" onSort={handleSort} />);
    fireEvent.click(screen.getByRole('button', { name: '삭제한 날짜' }));
    expect(handleSort).toHaveBeenCalledWith('deletedDate');
  });

  it('정렬 기준 열에만 꺾쇠를 그리고 기본은 이름 열이다', () => {
    const { container } = render(<DetailsHeader />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '이름' }).querySelector('svg')).toHaveClass(
      'rotate-180',
    );
  });

  it('열 제목을 누르면 onSort로 그 열을 알린다', () => {
    const handleSort = vi.fn();
    render(<DetailsHeader onSort={handleSort} />);
    fireEvent.click(screen.getByRole('button', { name: '유형' }));
    expect(handleSort).toHaveBeenCalledWith('type');
  });
});
