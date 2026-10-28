import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import { createExplorerContent } from '@/shared/utils/window-rules/window-rules';
import { BLOG_FOLDER_ID } from '@/shared/utils/workspace-rules/workspace-rules';

import { ExplorerWindowLayer } from './explorer-window-layer';

const POSTS = [
  { slug: 'a', title: '훅 정리', folderPath: ['React'], date: '2026-10-20' },
  { slug: 'b', title: 'useEffect 정리', folderPath: ['React', 'Hooks'], date: '2026-10-21' },
] as const;

const WORK_AREA = { width: 1920, height: 1032 } as const;

const handleClose = vi.fn();

type HarnessProps = {
  /** 창 id */
  id: string;
  /** 화면 방식 */
  device?: 'desktop' | 'mobile';
};

/**
 * 창 저장소에서 창 내용을 읽어 탐색기 층을 그린다(창 층이 하는 일).
 * @param props
 * @returns 탐색기 층
 */
function Harness(props: HarnessProps): JSX.Element | null {
  const { id, device = 'desktop' } = props;
  const target = useWindowStore((state) => state.windows[id]);
  if (target?.content.app !== 'file-explorer') {
    return null;
  }
  return (
    <ExplorerWindowLayer
      windowId={id}
      content={target.content}
      device={device}
      controls={{
        inactive: false,
        placement: 'normal',
        onMinimize: vi.fn(),
        onClose: handleClose,
        className: '',
      }}
    />
  );
}

/**
 * 위치를 보는 탐색기 창을 열어 그린다.
 * @param location 볼 위치
 * @param device 화면 방식
 * @returns 창 id
 */
function renderExplorer(location: string | null, device?: 'desktop' | 'mobile'): string {
  const id = useWindowStore
    .getState()
    .open('file-explorer', WORK_AREA, createExplorerContent(location));
  render(<Harness id={id} device={device} />);
  return id;
}

/**
 * 본문(폴더 내용) 영역.
 * @returns 폴더 내용
 */
function folderContent(): HTMLElement {
  return screen.getByRole('listbox', { name: '폴더 내용' });
}

/**
 * 탐색 창의 트리 칸 하나.
 * @param label 칸 이름
 * @returns 트리 칸
 */
function treeItem(label: string): HTMLElement {
  const item = within(screen.getByRole('tree'))
    .getAllByRole('treeitem')
    .find((entry) => entry.textContent === label);
  if (item === undefined) {
    throw new Error(`트리 칸이 없다: ${label}`);
  }
  return item;
}

const POINTER = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;

/** 탭 요소의 자리를 탭 차례마다 가로 100px씩으로 둔다(jsdom에는 그려진 자리가 없다). */
function mockTabRects(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
    this: Element,
  ) {
    const index = this.parentElement === null ? 0 : [...this.parentElement.children].indexOf(this);
    return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 32 });
  });
}

/**
 * 탭 제목들.
 * @returns 탭 제목
 */
function tabTitles(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

beforeEach(async () => {
  localStorage.clear();
  hydrateWorkspaceStore(POSTS);
  await act(async () => {
    await Promise.resolve();
  });
  handleClose.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  useWindowStore.getState().reset();
  useWorkspaceStore.getState().reset();
  localStorage.clear();
});

// @codocs [[파일 탐색기:조작]]
describe('파일 탐색기:조작', () => {
  it('탐색 창 칸은 끌어 놓을 곳이다', () => {
    renderExplorer(BLOG_FOLDER_ID);
    expect(treeItem('React')).toHaveAttribute('data-drop-target', 'folder:React');
  });

  it('폴더를 더블클릭하면 그 폴더로 이동한다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    expect(within(folderContent()).getByText('훅 정리')).toBeInTheDocument();
  });

  it('폴더를 더블클릭해도 새 탭을 열지 않고 같은 탭에서 이동한다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });

  it('같은 탭에서 위치를 옮기면 항목 자리를 새로 그려 스크롤을 맨 위로 돌린다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    const before = folderContent().parentElement;
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    expect(folderContent().parentElement).not.toBe(before);
  });

  it('Backspace를 누르면 뒤로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    fireEvent.keyDown(folderContent(), { key: 'Backspace' });
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('검색 상자에서 누른 Backspace는 뒤로 가지 않는다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    fireEvent.keyDown(screen.getByRole('searchbox', { name: '검색' }), { key: 'Backspace' });
    expect(tabTitles()).toEqual(['React']);
  });

  it('Alt + ←는 뒤로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    fireEvent.keyDown(folderContent(), { key: 'ArrowLeft', altKey: true });
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('본문 DOM 밖(포털 메뉴)에서 올라온 Backspace로는 뒤로 가지 않는다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    fireEvent.contextMenu(folderContent());
    fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Backspace' });
    // 메뉴가 열린 동안 바깥은 접근성 트리에서 숨겨지므로 숨은 요소까지 찾는다.
    expect(screen.getAllByRole('tab', { hidden: true }).map((tab) => tab.textContent)).toEqual([
      'React',
    ]);
  });

  it('Alt + →는 앞으로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    fireEvent.keyDown(folderContent(), { key: 'ArrowRight', altKey: true });
    expect(tabTitles()).toEqual(['React']);
  });
});

// @codocs [[파일 탐색기:탭]]
describe('파일 탐색기:탭', () => {
  it('탭을 끌어 순서를 바꾸면 창 내용의 탭 차례가 바뀐다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
      this: Element,
    ) {
      const index =
        this.parentElement === null ? 0 : [...this.parentElement.children].indexOf(this);
      return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 32 });
    });
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;
    const blog = screen.getByRole('tab', { name: /바탕 화면/ });
    fireEvent.pointerDown(blog, { ...pointer, clientX: 150, clientY: 10 });
    fireEvent.pointerMove(blog, { ...pointer, clientX: 20, clientY: 10 });
    expect(tabTitles()).toEqual(['바탕 화면', 'React']);
  });

  it('탭을 두 칸 이상 끌면 끈 자리마다 차례대로 옮긴다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.dblClick(within(folderContent()).getByText('Blog'));
    mockTabRects();
    const last = screen.getAllByRole('tab')[2] ?? document.body;
    fireEvent.pointerDown(last, { ...POINTER, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(last, { ...POINTER, clientX: 150, clientY: 10 });
    fireEvent.pointerMove(last, { ...POINTER, clientX: 20, clientY: 10 });
    expect(tabTitles()).toEqual(['Blog', 'React', '바탕 화면']);
  });

  it('끄는 동안 탭이 닫히면 닫힌 탭이 되살아나지 않는다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    mockTabRects();
    const last = screen.getAllByRole('tab')[2] ?? document.body;
    fireEvent.pointerDown(last, { ...POINTER, clientX: 250, clientY: 10 });
    fireEvent.pointerMove(last, { ...POINTER, clientX: 150, clientY: 10 });
    fireEvent.click(
      within(screen.getAllByRole('tab')[0]?.parentElement ?? document.body).getByRole('button', {
        name: '탭 닫기',
      }),
    );
    fireEvent.pointerMove(last, { ...POINTER, clientX: 20, clientY: 10 });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('탭 제목은 현재 폴더 이름이다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    expect(tabTitles()).toEqual(['React']);
  });

  it('뒤로 버튼은 바로 앞에 본 위치로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('앞으로 버튼은 뒤로 오기 전 위치로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.dblClick(within(folderContent()).getByText('React'));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await userEvent.click(screen.getByRole('button', { name: '앞으로' }));
    expect(tabTitles()).toEqual(['React']);
  });

  it('뒤로 갈 기록이 없으면 뒤로 버튼이 비활성이다', () => {
    renderExplorer(BLOG_FOLDER_ID);
    expect(screen.getByRole('button', { name: '뒤로' })).toBeDisabled();
  });

  it('앞으로 갈 기록이 없으면 앞으로 버튼이 비활성이다', () => {
    renderExplorer(BLOG_FOLDER_ID);
    expect(screen.getByRole('button', { name: '앞으로' })).toBeDisabled();
  });

  it('위로는 상위 폴더로 간다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '위로' }));
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('바탕화면에서는 위로가 비활성이다', () => {
    renderExplorer(null);
    expect(screen.getByRole('button', { name: '위로' })).toBeDisabled();
  });

  it('+ 버튼은 바탕 화면 위치를 보는 새 탭을 열고 그 탭을 고른다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    expect(tabTitles()).toEqual(['React', '바탕 화면']);
    expect(screen.getByRole('tab', { name: /바탕 화면/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('탭을 클릭하면 그 탭으로 바꾼다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.click(screen.getByRole('tab', { name: /React/ }));
    expect(within(folderContent()).getByText('훅 정리')).toBeInTheDocument();
  });

  it('탭의 ×를 누르면 그 탭을 닫는다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.click(
      within(
        screen.getByRole('tab', { name: /바탕 화면/ }).parentElement ?? document.body,
      ).getByRole('button', { name: '탭 닫기' }),
    );
    expect(tabTitles()).toEqual(['React']);
  });

  it('탭을 가운데 클릭하면 그 탭을 닫는다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    fireEvent(
      screen.getByRole('tab', { name: /React/ }),
      new MouseEvent('auxclick', { bubbles: true, button: 1 }),
    );
    expect(tabTitles()).toEqual(['바탕 화면']);
  });

  it('고른 탭만 Tab 키로 닿는다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0]);
  });

  it('탭에서 ←를 누르면 앞 탭을 고르고 그 탭에 포커스를 옮긴다', async () => {
    renderExplorer('folder:React');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    act(() => {
      screen.getByRole('tab', { name: /바탕 화면/ }).focus();
    });
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /React/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /React/ })).toHaveFocus();
  });

  it('마지막 탭을 닫으면 창을 닫는다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.click(screen.getByRole('button', { name: '탭 닫기' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('다른 창에서 지금 보는 폴더를 휴지통에 넣으면 상위 폴더로 이동한다', () => {
    renderExplorer('folder:React/Hooks');
    act(() => {
      useWorkspaceStore.getState().trashItems(['folder:React']);
    });
    expect(tabTitles()).toEqual(['Blog']);
  });
});

// @codocs [[파일 탐색기:구성]]
describe('파일 탐색기:구성', () => {
  it('위치 칸을 누르면 그 위치로 간다', async () => {
    renderExplorer('folder:React/Hooks');
    expect(screen.getByRole('button', { name: 'Hooks', current: 'page' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Blog' }));
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('탐색 창의 폴더를 누르면 그 폴더로 간다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.click(within(screen.getByRole('tree')).getByText('휴지통'));
    expect(tabTitles()).toEqual(['휴지통']);
  });

  it('탐색 창은 현재 위치를 고른 칸으로 표시한다', () => {
    renderExplorer('folder:React');
    const selected = within(screen.getByRole('tree'))
      .getAllByRole('treeitem')
      .filter((item) => item.getAttribute('aria-selected') === 'true');
    expect(selected.map((item) => item.textContent)).toEqual(['React']);
  });

  it('탐색 창의 꺾쇠를 누르면 접힌 폴더를 펼친다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.click(treeItem('React').querySelector('svg') ?? document.body);
    expect(within(screen.getByRole('tree')).getByText('Hooks')).toBeInTheDocument();
  });

  it('탐색 창의 꺾쇠를 눌러도 그 폴더로 이동하지 않는다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.click(treeItem('React').querySelector('svg') ?? document.body);
    expect(tabTitles()).toEqual(['Blog']);
  });

  it('탐색 창 칸에서 →를 누르면 접힌 폴더를 펼친다', () => {
    renderExplorer(BLOG_FOLDER_ID);
    fireEvent.keyDown(treeItem('React'), { key: 'ArrowRight' });
    expect(treeItem('React')).toHaveAttribute('aria-expanded', 'true');
  });

  it('탐색 창 칸에서 ←를 누르면 펼친 폴더를 접는다', () => {
    renderExplorer('folder:React');
    fireEvent.keyDown(treeItem('React'), { key: 'ArrowLeft' });
    expect(treeItem('React')).toHaveAttribute('aria-expanded', 'false');
  });

  it('현재 위치의 조상을 접으면 가장 가까운 보이는 조상이 Tab으로 닿는다', () => {
    renderExplorer('folder:React/Hooks');
    fireEvent.keyDown(treeItem('Blog'), { key: 'ArrowLeft' });
    expect(treeItem('Blog')).toHaveAttribute('tabindex', '0');
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('모바일은 탭 하나만 써서 탭 줄과 새 탭 버튼이 없다', () => {
    renderExplorer(BLOG_FOLDER_ID, 'mobile');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '새 탭' })).not.toBeInTheDocument();
  });

  it('모바일은 폴더를 탭하면 같은 탭에서 그 폴더로 이동한다', async () => {
    renderExplorer(BLOG_FOLDER_ID, 'mobile');
    await userEvent.click(within(folderContent()).getByText('React'));
    expect(within(folderContent()).getByText('훅 정리')).toBeInTheDocument();
  });

  it('데스크톱은 폴더를 한 번 클릭해도 이동하지 않는다', async () => {
    renderExplorer(BLOG_FOLDER_ID);
    await userEvent.click(within(folderContent()).getByText('React'));
    expect(tabTitles()).toEqual(['Blog']);
  });
});
