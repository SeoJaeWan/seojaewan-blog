import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/features/window/window';

import { Workspace } from './workspace';

beforeEach(() => {
  useWindowStore.getState().reset();
});

/** 바탕화면의 Blog 폴더 아이콘을 더블클릭한다. 아이콘은 창보다 앞(DOM 순서)에 있다. */
async function openBlogFolder(): Promise<void> {
  const [icon] = screen.getAllByText('Blog');
  await userEvent.dblClick(icon ?? document.body);
}

// @codocs [[바탕화면:표시하는 항목]]
describe('바탕화면:표시하는 항목', () => {
  it('처음에는 바탕화면에 휴지통, Blog 폴더, 외부 링크(GitHub, 이력서)가 보인다', () => {
    render(<Workspace />);
    const desktop = screen.getByRole('main', { name: '바탕화면' });
    for (const name of ['휴지통', 'Blog', 'GitHub', '이력서']) {
      expect(within(desktop).getByText(name)).toBeInTheDocument();
    }
  });
});

// @codocs [[작업 표시줄:시계]]
describe('작업 표시줄:시계', () => {
  it('서버 HTML에는 시계를 그리지 않고, 마운트한 뒤 기기의 시간을 보여준다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 15, 24));
    try {
      expect(renderToString(<Workspace />)).not.toContain('오후 3:24');
      render(<Workspace />);
      expect(screen.getByText('오후 3:24')).toBeInTheDocument();
      expect(screen.getByText('2026-10-20')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// @codocs [[작업 표시줄:앱 버튼]]
describe('작업 표시줄:앱 버튼', () => {
  it('열린 창이 없을 때 누르면 탐색기는 Blog 폴더로 연다', async () => {
    render(<Workspace />);
    await userEvent.click(screen.getByRole('button', { name: '파일 탐색기' }));
    const region = screen.getByRole('region', { name: 'Blog - 파일 탐색기' });
    expect(within(region).getAllByText('Blog').length).toBeGreaterThan(0);
  });

  it('창이 1개이고 맨 앞이면 최소화하고, 다시 누르면 복원한다', async () => {
    render(<Workspace />);
    const button = screen.getByRole('button', { name: 'Chrome' });
    await userEvent.click(button);
    expect(screen.getByRole('region', { name: '새 탭 - Chrome' })).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByRole('region', { name: '새 탭 - Chrome' })).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByRole('region', { name: '새 탭 - Chrome' })).toBeInTheDocument();
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기', () => {
  it('창이 여러 개일 때 누르면 미리보기를 띄우고, 고른 창을 맨 앞으로 가져온다', async () => {
    render(<Workspace />);
    await openBlogFolder();
    await openBlogFolder();
    const [first] = screen.getAllByRole('region', { name: 'Blog - 파일 탐색기' });
    expect(first).toHaveAttribute('data-window-state', 'inactive');
    await userEvent.click(screen.getByRole('button', { name: '파일 탐색기' }));
    const previews = screen.getAllByRole('button', { name: 'Blog - 파일 탐색기' });
    expect(previews).toHaveLength(2);
    await userEvent.click(previews[0] ?? document.body);
    expect(first).toHaveAttribute('data-window-state', 'active');
    expect(screen.queryAllByRole('button', { name: 'Blog - 파일 탐색기' })).toHaveLength(0);
  });

  it('미리보기의 닫기 버튼을 누르면 그 창을 닫는다', async () => {
    render(<Workspace />);
    await openBlogFolder();
    await openBlogFolder();
    await userEvent.click(screen.getByRole('button', { name: '파일 탐색기' }));
    const [preview] = screen.getAllByRole('button', { name: 'Blog - 파일 탐색기' });
    await userEvent.click(
      within(preview ?? document.body).getByRole('button', { name: '창 닫기' }),
    );
    expect(screen.getAllByRole('region', { name: 'Blog - 파일 탐색기' })).toHaveLength(1);
  });
});
