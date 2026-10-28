import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAG_REJECTED_ATTRIBUTE } from '@/shared/hooks/use-item-drag/use-item-drag';
import { useItemClipboardStore } from '@/shared/stores/item-clipboard-store/item-clipboard-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import { createExplorerContent } from '@/shared/utils/window-rules/window-rules';
import {
  BLOG_FOLDER_ID,
  isItemInTrash,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { DesktopIconsLayer } from './desktop-icons-layer';

const POSTS = [{ slug: 'a', title: '가', folderPath: [], date: '2026-10-20' }] as const;

/**
 * 바탕화면 아이콘을 이름으로 찾는다.
 * @param name 아이콘 이름
 * @returns 아이콘 요소
 */
function icon(name: string): HTMLElement {
  return screen.getByRole('option', { name });
}

/**
 * 고른 아이콘 이름을 돌려준다.
 * @returns 고른 아이콘 이름
 */
function selectedNames(): string[] {
  return screen.getAllByRole('option', { selected: true }).map((element) => element.textContent);
}

/**
 * 빈 곳 메뉴를 열어 하위 메뉴의 항목을 고른다. jsdom에서는 하위 메뉴가 포인터로 열리지 않아 키보드로 연다.
 * @param submenu 하위 메뉴를 여는 항목 이름
 * @param role 고를 항목의 역할
 * @param name 고를 항목 이름
 */
async function chooseDesktopMenuItem(
  submenu: string,
  role: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox',
  name: string,
): Promise<void> {
  openMenu(screen.getByRole('listbox'));
  screen.getByRole('menuitem', { name: submenu }).focus();
  await user().keyboard('{ArrowRight}');
  const item = await screen.findByRole(role, { name });
  item.focus();
  await user().keyboard('{Enter}');
}

/**
 * 요소를 우클릭해 메뉴를 열고 메뉴 항목 이름을 돌려준다.
 * @param element 우클릭할 요소
 * @returns 메뉴 항목 이름
 */
function openMenu(element: HTMLElement): string[] {
  fireEvent.contextMenu(element);
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

let userInstance: ReturnType<typeof userEvent.setup> = userEvent.setup();

/**
 * 테스트마다 만든 사용자 입력기를 돌려준다. 눌러 둔 수정 키(Ctrl, Shift)가 다음 입력까지 이어진다.
 * @returns 사용자 입력기
 */
function user(): ReturnType<typeof userEvent.setup> {
  return userInstance;
}

beforeEach(() => {
  // Base UI 메뉴가 열려 있는 동안 바깥에 pointer-events: none을 걸어, 하위 메뉴 항목을 누를 수 있게 검사를 끈다.
  userInstance = userEvent.setup({ pointerEventsCheck: 0 });
  localStorage.clear();
  hydrateWorkspaceStore(POSTS);
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementFromPoint');
  useWindowStore.getState().reset();
  useWorkspaceStore.getState().reset();
  useItemClipboardStore.getState().clear();
  document.documentElement.removeAttribute(DRAG_REJECTED_ATTRIBUTE);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** 화면 폭을 모바일 기준(768px 미만)으로 둔다. */
function useMobileScreen(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

/**
 * 열린 창들의 내용을 돌려준다.
 * @returns 창 내용
 */
function windowContents(): unknown[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => windows[id]?.content);
}

// @codocs [[바탕화면:표시하는 항목]]
describe('바탕화면:표시하는 항목', () => {
  it('상위 폴더가 없는 항목과 휴지통을 보여 준다', () => {
    render(<DesktopIconsLayer />);
    for (const name of ['휴지통', 'Blog', 'GitHub']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('가')).not.toBeInTheDocument();
  });

  // @codocs [[항목 모델:외부 링크]]
  it('주소를 비워 둔 외부 링크(이력서)는 보이지 않는다', () => {
    render(<DesktopIconsLayer />);
    expect(screen.queryByText('이력서')).not.toBeInTheDocument();
  });

  it('항목을 폴더 안으로 옮기면 바탕화면에서 사라지고, 바탕화면으로 옮기면 나타난다', () => {
    render(<DesktopIconsLayer />);
    act(() => {
      useWorkspaceStore.getState().moveItems(['link:github'], BLOG_FOLDER_ID);
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(screen.getByText('가')).toBeInTheDocument();
  });

  it('휴지통에 항목이 있으면 휴지통 아이콘은 찬 모양이고, 모두 복원하면 빈 모양이다', () => {
    const { container } = render(<DesktopIconsLayer />);
    /**
     * 휴지통 아이콘 그림 주소를 돌려준다.
     * @returns 그림 주소
     */
    function recycleBinIcon(): string {
      return container.querySelector('img[src*="file-recycle-bin"]')?.getAttribute('src') ?? '';
    }
    expect(recycleBinIcon()).toContain('file-recycle-bin-empty');
    act(() => {
      useWorkspaceStore.getState().trashItems(['link:github']);
    });
    expect(recycleBinIcon()).toContain('file-recycle-bin-full');
    act(() => {
      useWorkspaceStore.getState().restoreItems(['link:github']);
    });
    expect(recycleBinIcon()).toContain('file-recycle-bin-empty');
  });
});

// @codocs [[창 동작:열기 규칙]]
describe('창 동작:열기 규칙', () => {
  it('Blog 폴더 아이콘을 더블클릭하면 그 폴더를 보는 새 탐색기 창을 연다', async () => {
    render(<DesktopIconsLayer />);
    await user().dblClick(screen.getByText('Blog'));
    expect(windowContents()).toEqual([createExplorerContent(BLOG_FOLDER_ID)]);
  });

  it('휴지통 아이콘을 더블클릭하면 휴지통을 보는 탐색기 창을 연다', async () => {
    render(<DesktopIconsLayer />);
    await user().dblClick(screen.getByText('휴지통'));
    expect(windowContents()).toEqual([createExplorerContent(RECYCLE_BIN_ID)]);
  });

  it('외부 링크 아이콘을 더블클릭하면 창을 만들지 않고 실제 브라우저의 새 탭으로 연다', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DesktopIconsLayer />);
    await user().dblClick(screen.getByText('GitHub'));
    expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
    expect(useWindowStore.getState().order).toHaveLength(0);
  });
});

// @codocs [[바탕화면:아이콘 조작]]
describe('바탕화면:아이콘 조작', () => {
  it('클릭하면 고르고, Ctrl + 클릭은 더하거나 빼고, 빈 곳을 누르면 선택을 지운다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    expect(selectedNames()).toEqual(['Blog']);
    await user().keyboard('{Control>}');
    await user().click(icon('GitHub'));
    await user().keyboard('{/Control}');
    expect(selectedNames()).toEqual(['Blog', 'GitHub']);
    fireEvent.pointerDown(screen.getByRole('listbox'), { button: 0, pointerType: 'mouse' });
    expect(screen.queryAllByRole('option', { selected: true })).toHaveLength(0);
  });

  it('Shift + 클릭은 마지막으로 고른 아이콘부터 격자 순서로 범위를 고른다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('휴지통'));
    await user().keyboard('{Shift>}');
    await user().click(icon('GitHub'));
    await user().keyboard('{/Shift}');
    expect(selectedNames()).toEqual(['휴지통', 'Blog', 'GitHub']);
  });

  it('방향키는 격자에서 옆 아이콘으로 선택을 옮기고, Ctrl + A는 모두 고른다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('휴지통'));
    await user().keyboard('{ArrowDown}');
    expect(selectedNames()).toEqual(['Blog']);
    expect(icon('Blog')).toHaveFocus();
    await user().keyboard('{Control>}a{/Control}');
    expect(selectedNames()).toEqual(['휴지통', 'Blog', 'GitHub']);
  });

  it('Enter는 고른 아이콘을 열고, Delete는 휴지통으로 보낸다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{Enter}');
    expect(windowContents()).toEqual([createExplorerContent(BLOG_FOLDER_ID)]);
    await user().click(icon('GitHub'));
    await user().keyboard('{Delete}');
    expect(isItemInTrash(useWorkspaceStore.getState(), 'link:github')).toBe(true);
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('지우면 격자 순서의 다음 아이콘(없으면 이전 아이콘)으로 선택과 포커스를 옮긴다', async () => {
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    await user().click(icon('GitHub'));
    await user().keyboard('{Delete}');
    expect(selectedNames()).toEqual(['가']);
    expect(icon('가')).toHaveFocus();
    await user().keyboard('{Delete}');
    expect(selectedNames()).toEqual(['Blog']);
    expect(icon('Blog')).toHaveFocus();
  });

  it('메뉴의 삭제로 지워도 메뉴가 닫힌 뒤 다음 아이콘으로 포커스를 옮긴다', async () => {
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    openMenu(icon('GitHub'));
    await user().click(screen.getByRole('menuitem', { name: /^삭제/ }));
    expect(isItemInTrash(useWorkspaceStore.getState(), 'link:github')).toBe(true);
    await waitFor(() => {
      expect(icon('가')).toHaveFocus();
    });
    expect(selectedNames()).toEqual(['가']);
  });

  it('휴지통은 Delete로 보내지 않고, Blog 폴더는 Delete로 휴지통에 보낸다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('휴지통'));
    await user().keyboard('{Delete}');
    expect(icon('휴지통')).toBeInTheDocument();
    await user().click(icon('Blog'));
    await user().keyboard('{Delete}');
    expect(screen.queryByRole('option', { name: 'Blog' })).not.toBeInTheDocument();
    expect(isItemInTrash(useWorkspaceStore.getState(), BLOG_FOLDER_ID)).toBe(true);
  });

  it('Ctrl + X로 고른 아이콘을 잘라내면 탐색기 창과 함께 쓰는 잘라낸 항목이 되고, 흐리게 보인다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('GitHub'));
    await user().keyboard('{Control>}x{/Control}');
    expect(useItemClipboardStore.getState().cutIds).toEqual(['link:github']);
    expect(icon('GitHub').querySelectorAll('.opacity-cut')).toHaveLength(2);
  });

  it('잘라낸 항목은 Ctrl + V로 바탕화면에 붙여넣고, 잘라낸 것을 비운 뒤 붙여넣은 항목을 고른다', async () => {
    act(() => {
      useItemClipboardStore.getState().cut(['post:a']);
    });
    render(<DesktopIconsLayer />);
    await user().click(icon('GitHub'));
    await user().keyboard('{Control>}v{/Control}');
    expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBeNull();
    expect(useItemClipboardStore.getState().cutIds).toEqual([]);
    expect(selectedNames()).toEqual(['가']);
  });

  it('F2는 폴더 이름 바꾸기를 시작하고, Enter로 확정한다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{F2}');
    const field = screen.getByRole('textbox', { name: '새 이름' });
    expect(field).toHaveFocus();
    await user().clear(field);
    await user().type(field, '내 블로그{Enter}');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('내 블로그');
    expect(screen.queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
    expect(icon('내 블로그')).toHaveFocus();
  });

  it('Esc는 이름 바꾸기를 취소하고, 글·외부 링크는 F2로 이름을 바꾸지 않는다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{F2}');
    await user().type(screen.getByRole('textbox', { name: '새 이름' }), 'x{Escape}');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
    await user().click(icon('GitHub'));
    await user().keyboard('{F2}');
    expect(screen.queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
  });

  it('폴더·휴지통 위에 끌어 놓으면 그 폴더로 옮기거나 휴지통으로 보내고, 끄는 동안 이동 툴팁을 보인다', () => {
    const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    });
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    elementFromPoint.mockReturnValue(icon('Blog'));
    const github = icon('GitHub');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(github, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(github, { ...pointer, clientX: 40, clientY: 40 });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Blog(으)로 이동');
    expect(icon('Blog')).toHaveAttribute('aria-selected', 'true');
    fireEvent.pointerUp(github, { ...pointer, clientX: 40, clientY: 40 });
    expect(useWorkspaceStore.getState().items['link:github']?.parentId).toBe(BLOG_FOLDER_ID);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    elementFromPoint.mockReturnValue(icon('휴지통'));
    const post = icon('가');
    fireEvent.pointerDown(post, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(post, { ...pointer, clientX: 40, clientY: 40 });
    fireEvent.pointerUp(post, { ...pointer, clientX: 40, clientY: 40 });
    expect(isItemInTrash(useWorkspaceStore.getState(), 'post:a')).toBe(true);
  });

  it('자동 정렬이 켜져 있으면 빈 곳에 놓아도 정렬된 자리로 돌아가고, 꺼져 있으면 놓은 칸으로 옮긴다', () => {
    render(<DesktopIconsLayer />);
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    /**
     * 아이콘을 오른쪽으로 두 칸(보통 아이콘 간격 92px) 끌어 놓는다.
     * @param name 아이콘 이름
     */
    function dragRight(name: string): void {
      const element = icon(name);
      fireEvent.pointerDown(element, { ...pointer, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(element, { ...pointer, clientX: 194, clientY: 10 });
      fireEvent.pointerUp(element, { ...pointer, clientX: 194, clientY: 10 });
    }
    dragRight('GitHub');
    expect(icon('GitHub')).toHaveStyle({ left: '8px' });
    act(() => {
      useWorkspaceStore.getState().setDesktopAutoArrange(false);
    });
    dragRight('GitHub');
    expect(icon('GitHub')).toHaveStyle({ left: '192px', top: '188px' });
    expect(useWorkspaceStore.getState().desktop.positions['link:github']).toEqual({
      column: 2,
      row: 2,
    });
  });
});

// @codocs [[바탕화면:아이콘 조작]]
describe('바탕화면:아이콘 조작 - 탐색기 창으로 끌기', () => {
  it('아이콘을 탐색기 창 위에 놓으면 그 창이 보는 폴더로 옮긴다', () => {
    const explorer = document.createElement('div');
    explorer.setAttribute('data-drop-target', 'blog');
    explorer.setAttribute('data-drop-target-name', 'Blog');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => explorer,
    });
    render(<DesktopIconsLayer />);
    const github = icon('GitHub');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(github, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(github, { ...pointer, clientX: 40, clientY: 40 });
    fireEvent.pointerUp(github, { ...pointer, clientX: 40, clientY: 40 });
    expect(useWorkspaceStore.getState().items['link:github']?.parentId).toBe('blog');
  });

  it('자동 정렬을 끈 채 옮길 수 없는 곳(같은 이름 폴더가 있는 폴더) 위에 놓으면 아이콘이 제자리다', () => {
    const store = useWorkspaceStore.getState();
    const outer = store.createFolder(null);
    const inner = outer.ok ? store.createFolder(outer.id) : outer;
    if (!inner.ok) {
      throw new Error('폴더를 만들지 못함');
    }
    store.renameFolder(inner.id, 'Blog');
    store.setDesktopAutoArrange(false);
    const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    });
    render(<DesktopIconsLayer />);
    const before = useWorkspaceStore.getState().desktop.positions[BLOG_FOLDER_ID];
    elementFromPoint.mockReturnValue(icon('새 폴더'));
    const blog = icon('Blog');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(blog, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(blog, { ...pointer, clientX: 10, clientY: 200 });
    fireEvent.pointerUp(blog, { ...pointer, clientX: 10, clientY: 200 });
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.parentId).toBeNull();
    expect(useWorkspaceStore.getState().desktop.positions[BLOG_FOLDER_ID]).toEqual(before);
  });

  it('옮길 수 없는 곳 위로 끄는 동안은 강조와 툴팁 없이 not-allowed 커서를 보이고, 놓으면 되돌린다', () => {
    const store = useWorkspaceStore.getState();
    const outer = store.createFolder(null);
    const inner = outer.ok ? store.createFolder(outer.id) : outer;
    if (!inner.ok) {
      throw new Error('폴더를 만들지 못함');
    }
    store.renameFolder(inner.id, 'Blog');
    const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    });
    render(<DesktopIconsLayer />);
    const blog = icon('Blog');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(blog, { ...pointer, clientX: 10, clientY: 10 });
    elementFromPoint.mockReturnValue(icon('새 폴더'));
    fireEvent.pointerMove(blog, { ...pointer, clientX: 40, clientY: 40 });
    expect(document.documentElement).toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(icon('새 폴더')).toHaveAttribute('aria-selected', 'false');

    // 바탕화면 빈 곳은 칸 옮기기라 막힌 곳이 아니다.
    elementFromPoint.mockReturnValue(screen.getByRole('listbox'));
    fireEvent.pointerMove(blog, { ...pointer, clientX: 60, clientY: 60 });
    expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);

    elementFromPoint.mockReturnValue(icon('새 폴더'));
    fireEvent.pointerMove(blog, { ...pointer, clientX: 40, clientY: 40 });
    fireEvent.pointerUp(blog, { ...pointer, clientX: 40, clientY: 40 });
    expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
  });

  it('바탕화면 영역은 탐색기 항목을 끌어 놓을 곳이다', () => {
    render(<DesktopIconsLayer />);
    expect(screen.getByRole('listbox', { name: '바탕화면 아이콘' })).toHaveAttribute(
      'data-drop-target',
      'desktop',
    );
  });
});

// @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
describe('바탕화면:빈 곳 우클릭 메뉴', () => {
  it('빈 곳을 우클릭하면 보기·정렬 기준·새로 고침·붙여넣기·새로 만들기 메뉴를 열고 선택을 지운다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    expect(openMenu(screen.getByRole('listbox'))).toEqual([
      '보기',
      '정렬 기준',
      '새로 고침',
      '붙여넣기Ctrl+V',
      '새로 만들기',
    ]);
    expect(screen.queryAllByRole('option', { selected: true })).toHaveLength(0);
  });

  it('붙여넣기는 잘라낸 항목을 바탕화면으로 옮기고, 붙여넣을 것이 없으면 비활성이다', async () => {
    render(<DesktopIconsLayer />);
    openMenu(screen.getByRole('listbox'));
    expect(screen.getByRole('menuitem', { name: /^붙여넣기/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    act(() => {
      useItemClipboardStore.getState().cut(['post:a']);
    });
    openMenu(screen.getByRole('listbox'));
    await user().click(screen.getByRole('menuitem', { name: /^붙여넣기/ }));
    expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBeNull();
    expect(useItemClipboardStore.getState().cutIds).toEqual([]);
  });

  it('보기에서 아이콘 크기와 자동 정렬을, 정렬 기준에서 기준을 고른다', async () => {
    render(<DesktopIconsLayer />);
    await chooseDesktopMenuItem('보기', 'menuitemradio', '큰 아이콘');
    expect(useWorkspaceStore.getState().desktop.iconSize).toBe('large');

    await chooseDesktopMenuItem('보기', 'menuitemcheckbox', '아이콘 자동 정렬');
    expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(false);
    // 끄는 순간의 자리를 저장해 아이콘이 움직이지 않는다.
    expect(useWorkspaceStore.getState().desktop.positions[BLOG_FOLDER_ID]).toEqual({
      column: 0,
      row: 1,
    });

    await chooseDesktopMenuItem('정렬 기준', 'menuitemradio', '항목 유형');
    expect(useWorkspaceStore.getState().desktop.sortBy).toBe('type');
  });

  it('새로 만들기 > 폴더는 새 폴더를 만들고 바로 이름 바꾸기를 시작한다', async () => {
    render(<DesktopIconsLayer />);
    await chooseDesktopMenuItem('새로 만들기', 'menuitem', '폴더');
    const field = await screen.findByRole('textbox', { name: '새 이름' });
    expect(field).toHaveValue('새 폴더');
    expect(field).toHaveFocus();
  });
});

// @codocs [[바탕화면:아이콘 우클릭 메뉴]]
describe('바탕화면:아이콘 우클릭 메뉴', () => {
  it('항목 종류마다 메뉴가 다르고, 고정된 항목은 고정 해제를 보인다', () => {
    render(<DesktopIconsLayer />);
    expect(openMenu(icon('Blog'))).toEqual([
      '열기',
      '새 창에서 열기',
      '시작 화면에서 고정 해제',
      '잘라내기Ctrl+X',
      '이름 바꾸기F2',
      '삭제Delete',
    ]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(openMenu(icon('GitHub'))).toEqual([
      '열기',
      '링크 복사',
      '시작 화면에서 고정 해제',
      '잘라내기Ctrl+X',
      '삭제Delete',
    ]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(openMenu(icon('휴지통'))).toEqual(['열기', '휴지통 비우기']);
  });

  it('글 메뉴에는 새 창에서 열기와 링크 복사가 있다', () => {
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    expect(openMenu(icon('가'))).toEqual([
      '열기',
      '새 창에서 열기',
      '링크 복사',
      '시작 화면에 고정',
      '잘라내기Ctrl+X',
      '삭제Delete',
    ]);
  });

  it('여러 개를 고른 채 우클릭하면 열기·잘라내기·삭제 메뉴이고, 휴지통이 있으면 삭제를 고를 수 없다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{Control>}');
    await user().click(icon('GitHub'));
    await user().keyboard('{/Control}');
    expect(openMenu(icon('GitHub'))).toEqual(['열기', '잘라내기Ctrl+X', '삭제Delete']);
    expect(screen.getByRole('menuitem', { name: /^삭제/ })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await user().keyboard('{Control>}');
    await user().click(icon('휴지통'));
    await user().keyboard('{/Control}');
    openMenu(icon('GitHub'));
    expect(screen.getByRole('menuitem', { name: /^삭제/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('잘라내기는 고른 항목을 잘라낸다', async () => {
    render(<DesktopIconsLayer />);
    openMenu(icon('GitHub'));
    await user().click(screen.getByRole('menuitem', { name: /^잘라내기/ }));
    expect(useItemClipboardStore.getState().cutIds).toEqual(['link:github']);
  });

  it('이름 바꾸기는 메뉴가 닫힌 뒤 입력창에 포커스를 두고, 쓸 수 없는 문자는 입력되지 않게 막고 말풍선으로 알린다', async () => {
    render(<DesktopIconsLayer />);
    openMenu(icon('Blog'));
    await user().click(screen.getByRole('menuitem', { name: /^이름 바꾸기/ }));
    const field = await screen.findByRole('textbox', { name: '새 이름' });
    expect(field).toHaveFocus();
    await user().clear(field);
    await user().type(field, 'a:');
    expect(screen.getByRole('tooltip')).toHaveTextContent('다음 문자를 사용할 수 없습니다');
    expect(field).toHaveValue('a');
    await user().type(field, 'b{Enter}');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('ab');
  });

  it('시작 화면에 고정·고정 해제는 Start 고정됨을 바꾼다', async () => {
    render(<DesktopIconsLayer />);
    openMenu(icon('GitHub'));
    await user().click(screen.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }));
    expect(useWorkspaceStore.getState().startPins).not.toContain('link:github');
    openMenu(icon('GitHub'));
    await user().click(screen.getByRole('menuitem', { name: '시작 화면에 고정' }));
    expect(useWorkspaceStore.getState().startPins).toContain('link:github');
  });

  it('링크 복사는 글이면 공유 링크, 외부 링크면 그 주소를 클립보드에 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    openMenu(icon('가'));
    await user().click(screen.getByRole('menuitem', { name: '링크 복사' }));
    expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/posts/a`);
    openMenu(icon('GitHub'));
    await user().click(screen.getByRole('menuitem', { name: '링크 복사' }));
    expect(writeText).toHaveBeenLastCalledWith('https://github.com/SeoJaeWan');
  });

  it('새 창에서 열기는 열린 Chrome 창이 있어도 글을 새 Chrome 창으로 연다', async () => {
    act(() => {
      useWorkspaceStore.getState().moveItems(['post:a'], null);
    });
    render(<DesktopIconsLayer />);
    await user().dblClick(icon('가'));
    openMenu(icon('가'));
    await user().click(screen.getByRole('menuitem', { name: '새 창에서 열기' }));
    expect(windowContents()).toHaveLength(2);
  });

  it('휴지통 비우기는 지우지 않고 메시지 상자만 보여 준다', async () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['link:github']);
    });
    render(<DesktopIconsLayer />);
    openMenu(icon('휴지통'));
    await user().click(screen.getByRole('menuitem', { name: '휴지통 비우기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('소중한 글이에요 지우지 말아주세요')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: '확인' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(isItemInTrash(useWorkspaceStore.getState(), 'link:github')).toBe(true);
  });
});

// @codocs [[작업 공간:폴더 이름]]
describe('작업 공간:폴더 이름', () => {
  /**
   * Blog 폴더의 이름 바꾸기를 시작하고 입력창을 비운다.
   * @returns 입력창
   */
  async function startBlogRename(): Promise<HTMLElement> {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{F2}');
    const field = screen.getByRole('textbox', { name: '새 이름' });
    await user().clear(field);
    return field;
  }

  it('끝의 공백과 마침표는 잘라내고 확정한다', async () => {
    const field = await startBlogRename();
    await user().type(field, '메모. .{Enter}');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('메모');
  });

  it('비었거나 공백만 있으면 원래 이름으로 되돌린다', async () => {
    const field = await startBlogRename();
    await user().type(field, '   {Enter}');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
    expect(screen.queryByRole('textbox', { name: '새 이름' })).not.toBeInTheDocument();
  });

  it('255자를 넘게는 입력되지 않는다', async () => {
    const field = await startBlogRename();
    expect(field).toHaveAttribute('maxlength', '255');
  });

  it('예약 이름이면 메시지 상자를 보인 뒤 입력값을 둔 채 이름 바꾸기로 돌아간다', async () => {
    const field = await startBlogRename();
    await user().type(field, 'con.txt{Enter}');
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('지정한 장치 이름이 잘못되었습니다.')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: '확인' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    const returned = screen.getByRole('textbox', { name: '새 이름' });
    expect(returned).toHaveValue('con.txt');
    await waitFor(() => {
      expect(returned).toHaveFocus();
    });
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
  });

  it('같은 위치에 같은 이름의 폴더가 있으면 합치지 않고 메시지 상자를 보인 뒤 이름 바꾸기로 돌아간다', async () => {
    act(() => {
      useWorkspaceStore.getState().createFolder(null);
    });
    const field = await startBlogRename();
    await user().type(field, '새 폴더{Enter}');
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('이 위치에 같은 이름의 폴더가 이미 있습니다.'),
    ).toBeInTheDocument();
    await user().keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('새 폴더');
    expect(useWorkspaceStore.getState().items[BLOG_FOLDER_ID]?.name).toBe('Blog');
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  beforeEach(() => {
    useMobileScreen();
  });

  it('아이콘을 탭하면 연다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    expect(windowContents()).toEqual([createExplorerContent(BLOG_FOLDER_ID)]);
  });

  it('Ctrl + 탭과 Ctrl + A로 여러 개를 고르지 않는다', async () => {
    render(<DesktopIconsLayer />);
    await user().click(icon('Blog'));
    await user().keyboard('{Control>}');
    await user().click(icon('GitHub'));
    await user().keyboard('{/Control}');
    expect(selectedNames()).toEqual(['GitHub']);
    await user().keyboard('{Control>}a{/Control}');
    expect(selectedNames()).toEqual(['GitHub']);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'false');
  });

  it('아이콘을 끌어 옮기지 않는다', () => {
    const elementFromPoint = vi.fn<(x: number, y: number) => Element | null>();
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    });
    render(<DesktopIconsLayer />);
    elementFromPoint.mockReturnValue(icon('Blog'));
    const github = icon('GitHub');
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(github, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(github, { ...pointer, clientX: 40, clientY: 40 });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerUp(github, { ...pointer, clientX: 40, clientY: 40 });
    expect(useWorkspaceStore.getState().items['link:github']?.parentId).toBeNull();
  });

  it('메뉴가 열린 동안(길게 누른 뒤) 오는 탭은 아이콘을 열지 않는다', () => {
    render(<DesktopIconsLayer />);
    const blog = icon('Blog');
    fireEvent.contextMenu(blog);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(blog);
    expect(windowContents()).toEqual([]);
  });

  it('늘 자동 정렬이라 아이콘 자동 정렬 항목을 고를 수 없고, 눌러도 설정이 바뀌지 않는다', async () => {
    render(<DesktopIconsLayer />);
    openMenu(screen.getByRole('listbox'));
    screen.getByRole('menuitem', { name: '보기' }).focus();
    await user().keyboard('{ArrowRight}');
    const autoArrange = await screen.findByRole('menuitemcheckbox', { name: '아이콘 자동 정렬' });
    expect(autoArrange).toHaveAttribute('aria-disabled', 'true');
    await user().click(autoArrange);
    expect(useWorkspaceStore.getState().desktop.autoArrange).toBe(true);
  });
});
