import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';

import { StartMenuLayer } from './start-menu-layer';

const POSTS = [
  { slug: 'react-19-hooks', title: 'React 19 훅 정리', folderPath: ['React'], date: '2026-10-20' },
  {
    slug: 'react-compiler',
    title: 'React Compiler 도입기',
    folderPath: ['React'],
    date: '2026-09-28',
  },
  { slug: 'nextjs-cache', title: 'Next.js 캐시', folderPath: ['Next.js'], date: '2026-10-03' },
  { slug: 'p1', title: '글 하나', folderPath: [], date: '2026-08-01' },
  { slug: 'p2', title: '글 둘', folderPath: [], date: '2026-08-02' },
  { slug: 'p3', title: '글 셋', folderPath: [], date: '2026-08-03' },
  { slug: 'p4', title: '글 넷', folderPath: [], date: '2026-08-04' },
] as const;

beforeEach(() => {
  hydrateWorkspaceStore(POSTS);
});

afterEach(() => {
  usePanelStore.getState().reset();
  useWindowStore.getState().reset();
  useRestartStore.setState({ phase: 'idle' });
  useSearchStore.getState().clear();
  useWorkspaceStore.getState().reset();
  vi.unstubAllGlobals();
});

/**
 * Start 메뉴를 열어 그린다.
 * @returns Start 패널
 */
function renderStartPanel(): HTMLElement {
  usePanelStore.getState().toggleStart();
  render(<StartMenuLayer />);
  return screen.getByRole('dialog', { name: '시작' });
}

/**
 * 검색 패널을 열어 그린다. 데스크톱의 검색어는 작업 표시줄 검색칸이 쓰므로 저장소에 직접 넣는다.
 * @param query 검색어
 * @returns 검색 패널
 */
function renderSearchPanel(query: string): HTMLElement {
  usePanelStore.getState().openSearch();
  render(<StartMenuLayer />);
  act(() => {
    useSearchStore.getState().setQuery(query);
  });
  return screen.getByRole('dialog', { name: '검색' });
}

/**
 * 고정됨 칸을 이름으로 찾는다.
 * @param panel Start 패널
 * @param name 칸 이름
 * @returns 칸 요소
 */
function pinnedTile(panel: HTMLElement, name: string): HTMLElement {
  const [tile] = within(panel).getAllByRole('button', { name });
  return tile ?? document.body;
}

/**
 * 고정됨 칸을 우클릭해 메뉴를 열고 메뉴 항목 이름을 돌려준다.
 * @param tile 칸 요소
 * @returns 메뉴 항목 이름
 */
function openTileMenu(tile: HTMLElement): string[] {
  fireEvent.contextMenu(tile);
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  it('앱 항목을 열면 그 앱 창을 열고 Start 메뉴를 닫는다', async () => {
    const startPanel = renderStartPanel();
    // 고정됨 칸과 모두 목록의 줄에 같은 이름이 있어, DOM 순서가 앞인 고정됨 칸을 누른다
    await userEvent.click(pinnedTile(startPanel, 'File Explorer'));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
    expect(screen.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();
  });

  it('글 항목을 열면 Chrome에서 열고 Start 메뉴를 닫는다', async () => {
    const startPanel = renderStartPanel();
    await userEvent.click(within(startPanel).getByRole('button', { name: 'Next.js 캐시' }));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  it('폴더 항목을 열면 새 탐색기 창을 열고 Start 메뉴를 닫는다', async () => {
    const startPanel = renderStartPanel();
    await userEvent.click(pinnedTile(startPanel, 'Blog'));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  it('외부 링크를 열면 실제 브라우저의 새 탭으로 열고 창을 만들지 않는다', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const startPanel = renderStartPanel();
    await userEvent.click(pinnedTile(startPanel, 'GitHub'));
    expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
    expect(useWindowStore.getState().order).toEqual([]);
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('전원 메뉴의 다시 시작을 고르면 Start 메뉴를 닫고 다시 시작한다', async () => {
    const startPanel = renderStartPanel();
    // jsdom에서는 Base UI 메뉴가 포인터 클릭으로 열리지 않아 키보드로 연다
    within(startPanel).getByRole('button', { name: '전원' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('menuitem', { name: '다시 시작' }));
    expect(useRestartStore.getState().phase).toBe('covering');
    expect(usePanelStore.getState().openPanel).toBeNull();
  });
});

// @codocs [[Start 메뉴:고정됨]]
describe('Start 메뉴:고정됨', () => {
  it('화면이 낮으면 패널 높이를 작업 영역에서 틈(12)을 뺀 값 이하로 줄인다', () => {
    vi.stubGlobal('innerHeight', 400);
    renderStartPanel();
    // 작업 영역 352(400 - 작업 표시줄 48) - 틈 12
    expect(screen.getByRole('dialog', { name: '시작' }).firstElementChild).toHaveStyle({
      maxHeight: '340px',
    });
  });

  it('저장소의 고정 목록과 순서로 그린다', () => {
    const startPanel = renderStartPanel();
    const tiles = within(startPanel).getAllByRole('button', {
      name: /^(File Explorer|Chrome|Blog|GitHub)$/,
    });
    expect(tiles.slice(0, 4).map((tile) => tile.textContent)).toEqual([
      'File Explorer',
      'Chrome',
      'Blog',
      'GitHub',
    ]);
  });

  it('새로 고정한 항목은 맨 뒤에 보인다', () => {
    const startPanel = renderStartPanel();
    act(() => {
      useWorkspaceStore.getState().pinToStart('post:nextjs-cache');
    });
    const tiles = startPanel.querySelectorAll('[data-start-tile-id]');
    expect(tiles[tiles.length - 1]?.textContent).toBe('Next.js 캐시');
  });

  it('휴지통에 들어간 항목은 고정됨에서 보이지 않고 복원하면 다시 보인다', () => {
    const startPanel = renderStartPanel();
    act(() => {
      useWorkspaceStore.getState().trashItems(['link:github']);
    });
    expect(startPanel.querySelector('[data-start-tile-id="link:github"]')).toBeNull();
    act(() => {
      useWorkspaceStore.getState().restoreItems(['link:github']);
    });
    expect(startPanel.querySelector('[data-start-tile-id="link:github"]')).not.toBeNull();
  });

  it('우클릭 메뉴는 열기, 맨 앞으로 이동, 고정 해제이고 글과 외부 링크는 링크 복사도 있다', () => {
    const startPanel = renderStartPanel();
    expect(openTileMenu(pinnedTile(startPanel, 'Blog'))).toEqual([
      '열기',
      '맨 앞으로 이동',
      '시작 화면에서 고정 해제',
    ]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(openTileMenu(pinnedTile(startPanel, 'GitHub'))).toEqual([
      '열기',
      '맨 앞으로 이동',
      '링크 복사',
      '시작 화면에서 고정 해제',
    ]);
  });

  it('우클릭 메뉴의 맨 앞으로 이동은 그 항목을 고정됨 맨 앞으로 옮긴다', async () => {
    const startPanel = renderStartPanel();
    openTileMenu(pinnedTile(startPanel, 'GitHub'));
    await userEvent.click(screen.getByRole('menuitem', { name: '맨 앞으로 이동' }));
    expect(useWorkspaceStore.getState().startPins[0]).toBe('link:github');
  });

  it('맨 앞 항목은 맨 앞으로 이동을 고를 수 없다', () => {
    const startPanel = renderStartPanel();
    openTileMenu(pinnedTile(startPanel, 'File Explorer'));
    expect(screen.getByRole('menuitem', { name: '맨 앞으로 이동' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('우클릭 메뉴의 고정 해제는 그 항목을 고정됨에서 뺀다', async () => {
    const startPanel = renderStartPanel();
    openTileMenu(pinnedTile(startPanel, 'GitHub'));
    await userEvent.click(screen.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }));
    expect(useWorkspaceStore.getState().startPins).not.toContain('link:github');
    expect(startPanel.querySelector('[data-start-tile-id="link:github"]')).toBeNull();
  });

  it('우클릭 메뉴의 열기는 항목을 열고 Start 메뉴를 닫는다', async () => {
    const startPanel = renderStartPanel();
    openTileMenu(pinnedTile(startPanel, 'Blog'));
    await userEvent.click(screen.getByRole('menuitem', { name: '열기' }));
    expect(useWindowStore.getState().order).toHaveLength(1);
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  /**
   * GitHub 칸을 맨 앞 칸 자리로 끌어 놓고 끌기 뒤에 따라오는 클릭까지 보낸다.
   */
  function dragGithubToFront(): void {
    const startPanel = screen.getByRole('dialog', { name: '시작' });
    const tiles = startPanel.querySelectorAll('[data-start-tile-id]');
    tiles.forEach((tile, index) => {
      tile.getBoundingClientRect = () => new DOMRect(index * 100, 0, 100, 80);
    });
    const github = pinnedTile(startPanel, 'GitHub');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(github, { ...pointer, clientX: 350, clientY: 40 });
    fireEvent.pointerMove(github, { ...pointer, clientX: 50, clientY: 40 });
    fireEvent.pointerUp(github, { ...pointer, clientX: 50, clientY: 40 });
    fireEvent.click(github);
  }

  it('고정 칸을 다른 칸 자리로 끌면 순서가 바뀐다', () => {
    renderStartPanel();
    dragGithubToFront();
    expect(useWorkspaceStore.getState().startPins.slice(0, 4)).toEqual([
      'link:github',
      'app:file-explorer',
      'app:chrome',
      'blog',
    ]);
  });

  it('고정 칸을 끈 뒤 따라오는 클릭은 항목을 열지 않는다', () => {
    renderStartPanel();
    dragGithubToFront();
    expect(useWindowStore.getState().order).toEqual([]);
  });
});

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  it('모두 목록은 저장소의 앱, 폴더, 글, 외부 링크를 이름순으로 묶어 보인다', () => {
    const startPanel = renderStartPanel();
    expect(within(startPanel).getByRole('button', { name: 'Next.js 캐시' })).toBeInTheDocument();
    expect(within(startPanel).getByRole('button', { name: '글 하나' })).toBeInTheDocument();
    expect(within(startPanel).queryByText('휴지통', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('휴지통에 들어간 항목은 모두 목록에서 뺀다', () => {
    const startPanel = renderStartPanel();
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:p1']);
    });
    expect(within(startPanel).queryByRole('button', { name: '글 하나' })).not.toBeInTheDocument();
  });

  it('보기 메뉴에서 보기를 고르면 그 보기로 바뀌고 저장소에 저장한다', async () => {
    const startPanel = renderStartPanel();
    // jsdom에서는 Base UI 메뉴가 포인터 클릭으로 열리지 않아 키보드로 연다
    within(startPanel).getByRole('button', { name: '보기: 간단히' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: '범주' }));
    expect(useWorkspaceStore.getState().startAllView).toBe('category');
    expect(within(startPanel).getByRole('button', { name: '보기: 범주' })).toBeInTheDocument();
    expect(within(startPanel).getByText('외부 링크')).toBeInTheDocument();
  });

  it('다시 시작하면 보기가 처음 상태(간단히)로 돌아간다', () => {
    act(() => {
      useWorkspaceStore.getState().setStartAllView('grid');
    });
    act(() => {
      useWorkspaceStore.getState().reset();
    });
    expect(useWorkspaceStore.getState().startAllView).toBe('list');
  });
});

// @codocs [[Start 메뉴:검색]]
describe('Start 메뉴:검색', () => {
  it('위쪽 검색칸에 글자를 입력하면 Start 안이 검색 결과 화면으로 바뀐다', async () => {
    const startPanel = renderStartPanel();
    await userEvent.type(
      within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' }),
      'react',
    );
    expect(within(startPanel).getByText('최고 일치')).toBeInTheDocument();
    expect(within(startPanel).queryByText('고정됨')).not.toBeInTheDocument();
  });

  it('입력을 모두 지우면 원래 화면(고정됨, 모두)으로 돌아간다', async () => {
    const startPanel = renderStartPanel();
    const searchBox = within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    await userEvent.type(searchBox, 'react');
    await userEvent.clear(searchBox);
    expect(within(startPanel).getByText('고정됨')).toBeInTheDocument();
    expect(within(startPanel).queryByText('최고 일치')).not.toBeInTheDocument();
  });

  it('결과가 없으면 검색 결과 없음을 안내한다', async () => {
    const startPanel = renderStartPanel();
    await userEvent.type(
      within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' }),
      '없는이름',
    );
    expect(within(startPanel).getByText('검색 결과 없음')).toBeInTheDocument();
  });

  it('패널을 닫으면 검색어를 지운다', async () => {
    const startPanel = renderStartPanel();
    await userEvent.type(
      within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' }),
      'react',
    );
    act(() => {
      usePanelStore.getState().close();
    });
    expect(useSearchStore.getState().query).toBe('');
  });
});

// @codocs [[검색:결과 화면]]
describe('검색:결과 화면', () => {
  it('검색 패널은 검색어로 찾은 결과를 최고 일치와 종류별 묶음으로 보인다', () => {
    const searchPanel = renderSearchPanel('react');
    expect(within(searchPanel).getByText('최고 일치')).toBeInTheDocument();
    expect(within(searchPanel).getByText('글', { selector: 'p' })).toBeInTheDocument();
    expect(
      within(searchPanel).getByRole('button', { name: /^React 19 훅 정리/ }),
    ).toBeInTheDocument();
  });

  it('최고 일치가 기본으로 선택돼 있다', () => {
    const searchPanel = renderSearchPanel('react');
    const selected = searchPanel.querySelectorAll('[aria-current="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('React폴더');
  });

  it('최고 일치 카드에 열기를 두고, 글과 외부 링크만 링크 복사도 둔다', () => {
    const searchPanel = renderSearchPanel('react');
    expect(within(searchPanel).getByRole('button', { name: '열기' })).toBeInTheDocument();
    expect(
      within(searchPanel).queryByRole('button', { name: '링크 복사' }),
    ).not.toBeInTheDocument();
    act(() => {
      useSearchStore.getState().setQuery('Next.js 캐시');
    });
    expect(within(searchPanel).getByRole('button', { name: '링크 복사' })).toBeInTheDocument();
  });

  it('최고 일치 카드의 열기를 누르면 그 항목을 열고 검색 패널을 닫는다', async () => {
    const searchPanel = renderSearchPanel('Next.js 캐시');
    await userEvent.click(within(searchPanel).getByRole('button', { name: '열기' }));
    expect(useWindowStore.getState().order).toHaveLength(1);
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  it('최고 일치 카드의 링크 복사를 누르면 글의 공유 링크를 클립보드에 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const searchPanel = renderSearchPanel('Next.js 캐시');
    await userEvent.click(within(searchPanel).getByRole('button', { name: '링크 복사' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/posts/nextjs-cache`);
  });

  it('아래 방향키로 고른 항목을 옮기고 Enter로 연다', async () => {
    const startPanel = renderStartPanel();
    const searchBox = within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    await userEvent.type(searchBox, 'react');
    await userEvent.keyboard('{ArrowDown}');
    expect(startPanel.querySelector('[aria-current="true"]')).toHaveTextContent('React 19 훅 정리');
  });

  it('Enter를 누르면 고른 항목을 연다', async () => {
    const startPanel = renderStartPanel();
    const searchBox = within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    await userEvent.type(searchBox, 'react');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
  });

  it('방향키로 고른 줄이 보이는 영역 밖이면 스크롤해 보이게 한다', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    const startPanel = renderStartPanel();
    const searchBox = within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    await userEvent.type(searchBox, 'react');
    scrollIntoView.mockClear();
    await userEvent.keyboard('{ArrowDown}');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    scrollIntoView.mockRestore();
  });

  it('위 방향키로 고른 항목을 거꾸로 옮긴다', async () => {
    const startPanel = renderStartPanel();
    const searchBox = within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    await userEvent.type(searchBox, 'react');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(startPanel.querySelector('[aria-current="true"]')).toHaveTextContent('React 19 훅 정리');
  });

  /**
   * Start 검색칸에 입력하고 Enter로 최고 일치를 연다.
   */
  async function typeAndOpenFirstResult(): Promise<void> {
    const startPanel = renderStartPanel();
    await userEvent.type(
      within(startPanel).getByRole('searchbox', { name: '시작 메뉴 검색' }),
      'react',
    );
    await userEvent.keyboard('{Enter}');
  }

  it('항목을 열면 검색 패널이 닫힌다', async () => {
    await typeAndOpenFirstResult();
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  it('항목을 열면 검색어를 지운다', async () => {
    await typeAndOpenFirstResult();
    expect(useSearchStore.getState().query).toBe('');
  });

  it('Esc를 누르면 닫힌다', async () => {
    renderSearchPanel('react');
    await userEvent.keyboard('{Escape}');
    expect(usePanelStore.getState().openPanel).toBeNull();
  });

  it('결과가 없으면 검색 결과 없음을 안내한다', () => {
    const searchPanel = renderSearchPanel('없는이름');
    expect(within(searchPanel).getByText('검색 결과 없음')).toBeInTheDocument();
  });

  it('휴지통에 들어간 항목은 결과에 나오지 않는다', () => {
    const searchPanel = renderSearchPanel('Next.js');
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:nextjs-cache']);
    });
    expect(
      within(searchPanel).queryByRole('button', { name: /^Next.js 캐시/ }),
    ).not.toBeInTheDocument();
  });

  it('모바일 검색 패널은 패널 안 입력칸으로 검색한다', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    usePanelStore.getState().openSearch();
    render(<StartMenuLayer />);
    const searchPanel = screen.getByRole('dialog', { name: '검색' });
    await userEvent.type(within(searchPanel).getByRole('searchbox', { name: '검색' }), 'react');
    expect(within(searchPanel).getByText('최고 일치')).toBeInTheDocument();
  });
});

// @codocs [[검색:입력 전 화면]]
describe('검색:입력 전 화면', () => {
  it('추천에 최신 글 6개와 날짜를 보인다', () => {
    const searchPanel = renderSearchPanel('');
    const recommended = within(searchPanel).getAllByRole('button');
    expect(recommended).toHaveLength(6);
    expect(recommended[0]).toHaveTextContent('React 19 훅 정리2026-10-20');
  });

  it('모바일은 추천 글을 3개만 보인다', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    usePanelStore.getState().openSearch();
    render(<StartMenuLayer />);
    const searchPanel = screen.getByRole('dialog', { name: '검색' });
    expect(within(searchPanel).getAllByRole('button')).toHaveLength(3);
  });

  it('처음 방문하면 최근 항목이 없어 추천만 보인다', () => {
    const searchPanel = renderSearchPanel('');
    expect(within(searchPanel).queryByText('최근')).not.toBeInTheDocument();
    expect(within(searchPanel).getByText('추천')).toBeInTheDocument();
  });

  it('최근에 연 항목을 최대 5개 보인다', () => {
    act(() => {
      for (const id of ['blog', 'link:github', 'post:p1', 'post:p2', 'post:p3', 'post:p4']) {
        useWorkspaceStore.getState().recordRecentItem(id);
      }
    });
    const searchPanel = renderSearchPanel('');
    // 최근 5개와 추천 6개. 가장 오래된 Blog는 밀려난다.
    expect(within(searchPanel).getAllByRole('button')).toHaveLength(11);
    expect(within(searchPanel).getByText('GitHub')).toBeInTheDocument();
    expect(within(searchPanel).queryByText('Blog')).not.toBeInTheDocument();
  });

  it('휴지통에 들어간 글은 최근과 추천에서 뺀다', () => {
    act(() => {
      useWorkspaceStore.getState().recordRecentItem('post:p4');
      useWorkspaceStore.getState().trashItems(['post:p4']);
    });
    const searchPanel = renderSearchPanel('');
    expect(within(searchPanel).queryByText('글 넷')).not.toBeInTheDocument();
  });

  it('검색에서 항목을 열면 최근에 기록한다', async () => {
    const searchPanel = renderSearchPanel('Next.js 캐시');
    await userEvent.click(within(searchPanel).getByRole('button', { name: '열기' }));
    expect(useWorkspaceStore.getState().recentItemIds[0]).toBe('post:nextjs-cache');
  });
});
