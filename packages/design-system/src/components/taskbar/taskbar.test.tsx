import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TaskbarButton } from '../taskbar-button/taskbar-button';
import { Taskbar } from './taskbar';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('Taskbar', () => {
  it('Start 버튼과 시간·날짜 표시를 그린다', () => {
    render(<Taskbar />);
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
    expect(screen.getByText('시간')).toBeInTheDocument();
    expect(screen.getByText('날짜')).toBeInTheDocument();
  });

  it('search가 box면 검색 상자를, button이면 검색 버튼을 그린다', () => {
    const { rerender } = render(<Taskbar search="box" />);
    expect(screen.getByRole('searchbox', { name: '검색' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '검색' })).toBeNull();

    rerender(<Taskbar search="button" />);
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('children 자리(Apps 슬롯)에 앱 버튼을 넣는다', () => {
    render(
      <Taskbar>
        <TaskbarButton label="파일 탐색기" indicator="active" />
      </Taskbar>,
    );
    expect(screen.getByRole('button', { name: '파일 탐색기' })).toBeInTheDocument();
  });
});
