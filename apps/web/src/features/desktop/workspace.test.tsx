import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStartMenuStore } from '@/features/start-menu/start-menu';
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

/**
 * Start 메뉴 패널을 찾는다.
 * @returns Start 메뉴 패널, 없으면 null
 */
function queryStartPanel(): HTMLElement | null {
  return screen.queryByRole('dialog', { name: '시작' });
}

/**
 * 검색 패널을 찾는다.
 * @returns 검색 패널, 없으면 null
 */
function querySearchPanel(): HTMLElement | null {
  return screen.queryByRole('dialog', { name: '검색' });
}

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  afterEach(() => {
    useStartMenuStore.getState().reset();
  });

  it('Start 버튼을 누르면 Start 메뉴가 열리고, 다시 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    const startButton = screen.getByRole('button', { name: '시작' });
    expect(queryStartPanel()).not.toBeInTheDocument();
    await user.click(startButton);
    expect(queryStartPanel()).toBeInTheDocument();
    expect(startButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(startButton);
    expect(queryStartPanel()).not.toBeInTheDocument();
    expect(startButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc를 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.keyboard('{Escape}');
    expect(queryStartPanel()).not.toBeInTheDocument();
  });

  it('바깥을 클릭하면 닫히고, 패널 안을 클릭하면 닫히지 않는다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.click(within(getStartPanel()).getByText('고정됨'));
    expect(queryStartPanel()).toBeInTheDocument();
    await user.click(screen.getByText('휴지통'));
    expect(queryStartPanel()).not.toBeInTheDocument();
  });

  it('항목을 열면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.click(within(getStartPanel()).getByRole('button', { name: 'Chrome' }));
    expect(queryStartPanel()).not.toBeInTheDocument();
  });

  it('전원 메뉴가 열려 있을 때 Esc를 누르면 전원 메뉴만 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: '시작' }));
    // jsdom에서는 Base UI 메뉴가 포인터 클릭으로 열리지 않아 키보드로 연다
    within(getStartPanel()).getByRole('button', { name: '전원' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: '다시 시작' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem', { name: '다시 시작' })).not.toBeInTheDocument();
    expect(queryStartPanel()).toBeInTheDocument();
  });
});

// @codocs [[검색:개요]]
describe('검색:개요', () => {
  afterEach(() => {
    useStartMenuStore.getState().reset();
  });

  it('작업 표시줄 검색칸에 포커스하면 검색 패널이 열린다. Start가 열려 있었으면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: '시작' }));
    await user.click(screen.getByRole('searchbox', { name: '검색' }));
    expect(querySearchPanel()).toBeInTheDocument();
    expect(queryStartPanel()).not.toBeInTheDocument();
  });
});

// @codocs [[검색:결과 화면]]
describe('검색:결과 화면', () => {
  afterEach(() => {
    useStartMenuStore.getState().reset();
  });

  it('Esc를 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('searchbox', { name: '검색' }));
    await user.keyboard('{Escape}');
    expect(querySearchPanel()).not.toBeInTheDocument();
  });

  it('바깥을 클릭하면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Workspace />);
    await user.click(screen.getByRole('searchbox', { name: '검색' }));
    await user.click(screen.getByText('휴지통'));
    expect(querySearchPanel()).not.toBeInTheDocument();
  });
});

/**
 * 열린 Start 메뉴 패널을 찾는다.
 * @returns Start 메뉴 패널
 */
function getStartPanel(): HTMLElement {
  return screen.getByRole('dialog', { name: '시작' });
}

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:항목 열기', () => {
  it('Start 메뉴에서 앱 항목을 열면 그 앱 창이 열리고 Start 메뉴는 닫힌다', async () => {
    render(<Workspace />);
    await userEvent.click(screen.getByRole('button', { name: '시작' }));
    await userEvent.click(within(getStartPanel()).getByRole('button', { name: 'File Explorer' }));
    expect(screen.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeInTheDocument();
    expect(queryStartPanel()).not.toBeInTheDocument();
  });
});
