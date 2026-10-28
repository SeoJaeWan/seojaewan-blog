import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAG_REJECTED_ATTRIBUTE } from '@/shared/hooks/use-item-drag/use-item-drag';
import { useItemClipboardStore } from '@/shared/stores/item-clipboard-store/item-clipboard-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import type { ExplorerLocation } from '@/shared/utils/window-rules/window-rules';
import { BLOG_FOLDER_ID, RECYCLE_BIN_ID } from '@/shared/utils/workspace-rules/workspace-rules';

import { ExplorerBody } from './explorer-body';

const POSTS = [
  { slug: 'a', title: '훅 정리', folderPath: ['React'], date: '2026-10-20' },
  { slug: 'b', title: '회고', folderPath: [], date: '2026-10-21' },
  { slug: 'c', title: '캐시', folderPath: ['Next.js'], date: '2026-10-22' },
] as const;

const handleNavigate = vi.fn();
const handleOpenInNewTab = vi.fn();

let userInstance: ReturnType<typeof userEvent.setup> = userEvent.setup();

/**
 * 테스트마다 만든 사용자 입력기를 돌려준다. 눌러 둔 수정 키(Ctrl, Shift)가 다음 입력까지 이어진다.
 * @returns 사용자 입력기
 */
function user(): ReturnType<typeof userEvent.setup> {
  return userInstance;
}

/**
 * 위치를 보는 탐색기 본문을 그린다.
 * @param location 볼 위치
 * @param device 화면 방식
 * @returns 다시 그리는 함수
 */
function renderBody(
  location: ExplorerLocation,
  device: 'desktop' | 'mobile' = 'desktop',
): (next: ExplorerLocation) => void {
  const view = render(
    <ExplorerBody
      device={device}
      location={location}
      locationIcon={null}
      onNavigate={handleNavigate}
      onOpenInNewTab={handleOpenInNewTab}
    />,
  );
  return (next) => {
    view.rerender(
      <ExplorerBody
        key={next ?? 'desktop'}
        device={device}
        location={next}
        locationIcon={null}
        onNavigate={handleNavigate}
        onOpenInNewTab={handleOpenInNewTab}
      />,
    );
  };
}

/**
 * 항목 자리.
 * @returns 폴더 내용 목록
 */
function list(): HTMLElement {
  return screen.getByRole('listbox', { name: '폴더 내용' });
}

/**
 * 항목 하나.
 * @param name 항목 이름
 * @returns 항목
 */
function option(name: string): HTMLElement {
  return within(list()).getByRole('option', { name });
}

/**
 * 고른 항목 이름들.
 * @returns 이름
 */
function selectedNames(): string[] {
  return within(list())
    .getAllByRole('option')
    .filter((element) => element.getAttribute('aria-selected') === 'true')
    .map((element) => element.textContent);
}

/**
 * 위치에 있는 항목 이름들.
 * @param parentId 위치
 * @returns 이름
 */
function namesIn(parentId: string | null): string[] {
  return Object.values(useWorkspaceStore.getState().items)
    .filter((item) => item.parentId === parentId)
    .map((item) => item.name);
}

beforeEach(async () => {
  // Base UI 메뉴가 열려 있는 동안 바깥에 pointer-events: none을 걸어, 메뉴 항목을 누를 수 있게 검사를 끈다.
  userInstance = userEvent.setup({ pointerEventsCheck: 0 });
  localStorage.clear();
  hydrateWorkspaceStore(POSTS);
  await vi.waitFor(() => {
    expect(useWorkspaceStore.getState().items['post:a']).toBeDefined();
  });
  handleNavigate.mockClear();
  handleOpenInNewTab.mockClear();
});

afterEach(() => {
  Reflect.deleteProperty(document, 'elementFromPoint');
  useWindowStore.getState().reset();
  useWorkspaceStore.getState().reset();
  useItemClipboardStore.getState().clear();
  document.documentElement.removeAttribute(DRAG_REJECTED_ATTRIBUTE);
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// @codocs [[파일 탐색기:조작]]
describe('파일 탐색기:조작', () => {
  it('항목을 클릭하면 그 항목만 고른다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    expect(selectedNames()).toEqual(['React']);
  });

  it('Ctrl + 클릭하면 선택에 더한다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{Control>}');
    await user().click(option('회고'));
    await user().keyboard('{/Control}');
    expect(selectedNames()).toEqual(['React', '회고']);
  });

  it('Shift + 클릭하면 표시 순서로 범위를 고른다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('Next.js'));
    await user().keyboard('{Shift>}');
    await user().click(option('회고'));
    await user().keyboard('{/Shift}');
    expect(selectedNames()).toEqual(['Next.js', 'React', '회고']);
  });

  it('Ctrl + A는 모두 고른다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{Control>}a{/Control}');
    expect(selectedNames()).toHaveLength(3);
  });

  it('상태 줄에 항목 수를 보인다', () => {
    renderBody(BLOG_FOLDER_ID);
    expect(screen.getByText('항목 3개')).toBeInTheDocument();
  });

  it('상태 줄에 고른 항목 수를 보인다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    expect(screen.getByText('1개 항목 선택함')).toBeInTheDocument();
  });

  it('폴더를 고르고 Enter를 누르면 같은 탭에서 그 폴더로 간다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{Enter}');
    expect(handleNavigate).toHaveBeenCalledWith('folder:React');
  });

  it('글을 더블클릭하면 Chrome 창으로 연다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().dblClick(option('회고'));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
  });

  it('자세히 보기 열 제목에서 누른 Enter는 고른 항목을 열지 않는다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '자세히' }));
    await user().click(within(list()).getByRole('option', { name: /^React/ }));
    fireEvent.keyDown(screen.getByRole('button', { name: '유형' }), { key: 'Enter' });
    expect(handleNavigate).not.toHaveBeenCalled();
  });

  it('빈 곳에서 끄는 사각형은 그려진 자리에 걸친 항목을 고른다', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
      this: Element,
    ) {
      const id = this.getAttribute('data-explorer-item');
      const left = id === 'post:b' ? 210 : 0;
      return DOMRect.fromRect({ x: left, y: 10, width: 80, height: 80 });
    });
    renderBody(BLOG_FOLDER_ID);
    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;
    fireEvent.pointerDown(list(), { ...pointer, clientX: 200, clientY: 0 });
    fireEvent.pointerMove(list(), { ...pointer, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(list(), { ...pointer, clientX: 300, clientY: 100 });
    expect(selectedNames()).toEqual(['회고']);
  });

  it('Delete를 누르면 고른 항목을 휴지통으로 보낸다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('회고'));
    await user().keyboard('{Delete}');
    expect(namesIn(RECYCLE_BIN_ID)).toEqual(['회고']);
  });

  it('F2를 누르면 고른 폴더의 이름을 바꾼다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{F2}');
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('React');
  });

  it('같은 위치에 같은 이름의 폴더가 있으면 메시지 상자로 알린다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{F2}');
    await user().clear(screen.getByRole('textbox', { name: '새 이름' }));
    await user().keyboard('Next.js{Enter}');
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('이 위치에 같은 이름의 폴더가 이미 있습니다.'),
    ).toBeInTheDocument();
  });

  it('새로 만들기는 새 폴더를 만들고 이름 바꾸기를 시작한다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '새로 만들기' }));
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('새 폴더');
  });

  it('Ctrl + X 뒤 다른 폴더에서 Ctrl + V를 누르면 항목을 옮긴다', async () => {
    const show = renderBody(BLOG_FOLDER_ID);
    await user().click(option('회고'));
    await user().keyboard('{Control>}x{/Control}');
    show('folder:React');
    fireEvent.keyDown(list(), { key: 'v', ctrlKey: true });
    expect(namesIn('folder:React')).toContain('회고');
  });

  it('잘라낸 항목은 흐리게 그린다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('회고'));
    await user().keyboard('{Control>}x{/Control}');
    expect(option('회고').querySelector('.opacity-cut')).not.toBeNull();
  });

  it('잘라낸 것이 없으면 붙여넣기가 비활성이다', () => {
    renderBody(BLOG_FOLDER_ID);
    expect(screen.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
  });

  it('폴더를 자기 안으로는 붙여넣을 수 없다', async () => {
    const show = renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{Control>}x{/Control}');
    show('folder:React');
    expect(screen.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
  });

  it('아무것도 고르지 않으면 잘라내기가 비활성이다', () => {
    renderBody(BLOG_FOLDER_ID);
    expect(screen.getByRole('button', { name: '잘라내기' })).toBeDisabled();
  });

  it('폴더 하나를 고르지 않으면 이름 바꾸기가 비활성이다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('회고'));
    expect(screen.getByRole('button', { name: '이름 바꾸기' })).toBeDisabled();
  });

  it('Blog 폴더도 삭제해 휴지통으로 보낼 수 있다', async () => {
    renderBody(null);
    await user().click(option('Blog'));
    await user().click(screen.getByRole('button', { name: '삭제' }));
    expect(namesIn(RECYCLE_BIN_ID)).toEqual(['Blog']);
  });

  it('잘라낸 항목이 이미 지금 위치에 있으면 붙여넣기가 비활성이다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('회고'));
    await user().keyboard('{Control>}x{/Control}');
    expect(screen.getByRole('button', { name: '붙여넣기' })).toBeDisabled();
  });
});

// @codocs [[작업 공간:폴더 이름]]
describe('작업 공간:폴더 이름', () => {
  it('쓸 수 없는 문자는 입력되지 않게 막고 말풍선으로 알린다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{F2}');
    const field = screen.getByRole('textbox', { name: '새 이름' });
    await user().clear(field);
    await user().type(field, 'a*');
    expect(field).toHaveValue('a');
    expect(screen.getByRole('tooltip')).toHaveTextContent('다음 문자를 사용할 수 없습니다');
  });

  it('예약 이름이면 메시지 상자를 보인 뒤 이름 바꾸기로 돌아간다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(option('React'));
    await user().keyboard('{F2}');
    await user().clear(screen.getByRole('textbox', { name: '새 이름' }));
    await user().keyboard('LPT1{Enter}');
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('지정한 장치 이름이 잘못되었습니다.')).toBeInTheDocument();
    await user().click(within(dialog).getByRole('button', { name: '확인' }));
    expect(screen.getByRole('textbox', { name: '새 이름' })).toHaveValue('LPT1');
    expect(useWorkspaceStore.getState().items['folder:React']?.name).toBe('React');
  });
});

// @codocs [[파일 탐색기:우클릭 메뉴]]
describe('파일 탐색기:우클릭 메뉴', () => {
  it('항목을 우클릭하면 그 항목의 메뉴를 연다', () => {
    renderBody(BLOG_FOLDER_ID);
    fireEvent.contextMenu(option('React'));
    expect(screen.getByRole('menuitem', { name: /이름 바꾸기/ })).toBeInTheDocument();
  });

  it('빈 곳을 우클릭하면 빈 곳 메뉴를 연다', () => {
    renderBody(BLOG_FOLDER_ID);
    fireEvent.contextMenu(list());
    expect(screen.getByRole('menuitem', { name: /붙여넣기/ })).toBeInTheDocument();
  });

  it('새 탭에서 열기는 그 폴더를 새 탭으로 연다', async () => {
    renderBody(BLOG_FOLDER_ID);
    fireEvent.contextMenu(option('React'));
    await user().click(screen.getByRole('menuitem', { name: /새 탭에서 열기/ }));
    expect(handleOpenInNewTab).toHaveBeenCalledWith('folder:React');
  });
});

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('기본 보기는 보통 아이콘이라 열 제목이 없다', () => {
    renderBody(BLOG_FOLDER_ID);
    expect(screen.queryByRole('button', { name: '수정한 날짜' })).not.toBeInTheDocument();
  });

  it('상태 줄의 자세히 버튼을 누르면 자세히 보기로 바꾼다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '자세히' }));
    expect(screen.getByRole('button', { name: '수정한 날짜' })).toBeInTheDocument();
  });

  it('자세히 보기의 유형 칸은 폴더를 "파일 폴더"로 보인다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '자세히' }));
    const row = within(list()).getByRole('option', { name: /^React/ });
    expect(within(row).getByText('파일 폴더')).toBeInTheDocument();
  });

  it('열 제목을 누르면 그 열로 정렬한다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '자세히' }));
    await user().click(screen.getByRole('button', { name: '유형' }));
    expect(useWorkspaceStore.getState().explorerViews[BLOG_FOLDER_ID]?.sortBy).toBe('type');
  });

  it('보기는 폴더마다 따로 기억한다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().click(screen.getByRole('button', { name: '자세히' }));
    expect(useWorkspaceStore.getState().explorerViews['folder:React']).toBeUndefined();
  });

  it('이름 내림차순이어도 폴더를 앞에 둔다', () => {
    useWorkspaceStore.getState().setExplorerView(BLOG_FOLDER_ID, { sortDirection: 'desc' });
    renderBody(BLOG_FOLDER_ID);
    expect(
      within(list())
        .getAllByRole('option')
        .map((element) => element.textContent),
    ).toEqual(['React', 'Next.js', '회고']);
  });
});

// @codocs [[파일 탐색기:휴지통 보기]]
describe('파일 탐색기:휴지통 보기', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().trashItems(['post:b']);
  });

  it('휴지통은 원래 위치 열이 있는 자세히 보기다', () => {
    renderBody(RECYCLE_BIN_ID);
    expect(screen.getByRole('button', { name: '원래 위치' })).toBeInTheDocument();
  });

  it('휴지통 안의 항목은 더블클릭해도 열리지 않는다', async () => {
    renderBody(RECYCLE_BIN_ID);
    await user().dblClick(within(list()).getByRole('option', { name: /^회고/ }));
    expect(useWindowStore.getState().order).toEqual([]);
  });

  it('복원을 누르면 고른 항목을 원래 위치로 돌려놓는다', async () => {
    renderBody(RECYCLE_BIN_ID);
    await user().click(within(list()).getByRole('option', { name: /^회고/ }));
    await user().click(screen.getByRole('button', { name: '복원' }));
    expect(namesIn(BLOG_FOLDER_ID)).toContain('회고');
  });

  it('휴지통에 보낸 폴더 안의 항목만 고르면 복원이 비활성이다', async () => {
    useWorkspaceStore.getState().trashItems(['folder:React']);
    renderBody(RECYCLE_BIN_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    await user().click(within(list()).getByRole('option', { name: /^훅 정리/ }));
    expect(screen.getByRole('button', { name: '복원' })).toBeDisabled();
  });

  it('휴지통 비우기를 누르면 메시지 상자를 보인다', async () => {
    renderBody(RECYCLE_BIN_ID);
    await user().click(screen.getByRole('button', { name: '휴지통 비우기' }));
    expect(await screen.findByRole('alertdialog', { name: '휴지통 비우기' })).toBeInTheDocument();
  });
});

/**
 * 포인터 아래 맨 위 요소를 정한다(jsdom에는 elementFromPoint가 없다).
 * @param element 포인터 아래 요소
 */
function pointAt(element: Element): void {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => element,
  });
}

/**
 * 놓을 곳 속성만 단 요소(다른 탐색기 창 본문, 바탕화면)를 만든다.
 * @param id 놓을 곳 id
 * @param name 놓을 곳 이름
 * @returns 요소
 */
function dropTarget(id: string, name: string): Element {
  const element = document.createElement('div');
  element.setAttribute('data-drop-target', id);
  element.setAttribute('data-drop-target-name', name);
  return element;
}

const POINTER = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;

/**
 * 항목을 끌어 움직인다(놓지는 않는다).
 * @param element 끄는 항목
 */
function dragOver(element: HTMLElement): void {
  fireEvent.pointerDown(element, { ...POINTER, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(element, { ...POINTER, clientX: 60, clientY: 60 });
}

/**
 * 항목을 끌어 놓는다.
 * @param element 끄는 항목
 */
function dragAndDrop(element: HTMLElement): void {
  dragOver(element);
  fireEvent.pointerUp(element, { ...POINTER, clientX: 60, clientY: 60 });
}

// @codocs [[파일 탐색기:조작]]
describe('파일 탐색기:조작 - 끌어 옮기기', () => {
  it('항목을 같은 창의 폴더 위에 놓으면 그 폴더로 옮긴다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(option('React'));
    dragAndDrop(option('회고'));
    expect(namesIn('folder:React')).toContain('회고');
  });

  it('끄는 동안 놓을 곳 이름으로 이동 툴팁을 보인다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(option('React'));
    dragOver(option('회고'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('React(으)로 이동');
  });

  it('끄는 동안 놓을 폴더를 강조한다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(option('React'));
    dragOver(option('회고'));
    expect(option('React')).toHaveClass('bg-file-item-explorer-fill-selected');
  });

  it('다른 탐색기 창 본문에 놓으면 그 창이 보는 폴더로 옮긴다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(dropTarget('folder:Next.js', 'Next.js'));
    dragAndDrop(option('회고'));
    expect(namesIn('folder:Next.js')).toContain('회고');
  });

  it('바탕화면에 놓으면 바탕화면으로 옮긴다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(dropTarget('desktop', '바탕 화면'));
    dragAndDrop(option('회고'));
    expect(namesIn(null)).toContain('회고');
  });

  it('폴더를 자기 하위 폴더로 끌어 놓으면 제자리다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(dropTarget('folder:React', 'React'));
    dragAndDrop(option('React'));
    expect(namesIn(BLOG_FOLDER_ID)).toContain('React');
  });

  it('옮길 수 없는 곳 위에서는 이동 툴팁 없이 not-allowed 커서를 보이고, 놓으면 되돌린다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(dropTarget('folder:React/Hooks', 'Hooks'));
    dragOver(option('React'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
    fireEvent.pointerUp(option('React'), { ...POINTER, clientX: 60, clientY: 60 });
    expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
  });

  it('지금 보는 위치(이 창의 본문)는 놓을 곳이 아닐 뿐이라 not-allowed 커서를 보이지 않는다', () => {
    renderBody(BLOG_FOLDER_ID);
    pointAt(dropTarget(BLOG_FOLDER_ID, 'Blog'));
    dragOver(option('회고'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute(DRAG_REJECTED_ATTRIBUTE);
  });

  it('검색 중에는 결과 항목을 이 창 본문에 놓아도 제자리다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    pointAt(dropTarget(BLOG_FOLDER_ID, 'Blog'));
    dragAndDrop(within(list()).getByRole('option', { name: /^훅 정리/ }));
    expect(namesIn('folder:React')).toContain('훅 정리');
  });

  it('휴지통 안의 항목은 끌어 옮길 수 없다', () => {
    useWorkspaceStore.getState().trashItems(['post:b']);
    renderBody(RECYCLE_BIN_ID);
    pointAt(dropTarget('desktop', '바탕 화면'));
    dragAndDrop(within(list()).getByRole('option', { name: /^회고/ }));
    expect(namesIn(RECYCLE_BIN_ID)).toContain('회고');
  });
});

// @codocs [[파일 탐색기:폴더 안 검색]]
describe('파일 탐색기:폴더 안 검색', () => {
  it('검색어를 넣으면 현재 폴더와 하위 폴더에서 찾은 항목을 보인다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    expect(
      within(list())
        .getAllByRole('option')
        .map((element) => element.textContent),
    ).toEqual([expect.stringMatching(/^훅 정리/)]);
  });

  it('검색 결과는 자세히 보기에 위치 열을 더한다', async () => {
    renderBody(BLOG_FOLDER_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    expect(screen.getByRole('button', { name: '위치' })).toBeInTheDocument();
  });

  it('검색어를 지우면 원래 보기로 돌아간다', async () => {
    renderBody(BLOG_FOLDER_ID);
    const box = screen.getByRole('searchbox', { name: '검색' });
    await user().type(box, '훅');
    await user().clear(box);
    expect(screen.getByText('항목 3개')).toBeInTheDocument();
  });

  it('다른 위치로 가면 검색어를 비운다', async () => {
    const show = renderBody(BLOG_FOLDER_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    show('folder:React');
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('');
  });

  it('다른 위치로 갔다가 돌아와도 앞의 검색어가 되살아나지 않는다', async () => {
    const show = renderBody(BLOG_FOLDER_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    show('folder:React');
    show(BLOG_FOLDER_ID);
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('');
  });

  it('휴지통에서는 휴지통 항목 안에서 찾는다', async () => {
    useWorkspaceStore.getState().trashItems(['folder:React']);
    renderBody(RECYCLE_BIN_ID);
    await user().type(screen.getByRole('searchbox', { name: '검색' }), '훅');
    expect(within(list()).getAllByRole('option')).toHaveLength(1);
  });
});

// @codocs [[파일 탐색기:폴더 안 검색]]
describe('파일 탐색기:폴더 안 검색 - 모바일 검색 줄', () => {
  it('모바일 주소 줄에는 검색 상자 대신 검색 버튼이 있다', () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    expect(screen.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });

  it('검색 버튼을 누르면 ← 버튼과 검색 상자로 바뀌고 검색 상자에 포커스를 준다', async () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByRole('button', { name: '검색 닫기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveFocus();
  });

  it('입력이 비어 있으면 원래 폴더 내용을, 입력하면 검색 결과를 보여 준다', async () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByText('항목 3개')).toBeInTheDocument();
    await user().keyboard('훅');
    expect(
      within(list())
        .getAllByRole('option')
        .map((element) => element.textContent),
    ).toEqual([expect.stringMatching(/^훅 정리/)]);
  });

  it('← 버튼은 검색어를 지우고 원래 주소 줄로 돌아간다', async () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(screen.getByRole('button', { name: '검색' }));
    await user().keyboard('훅');
    await user().click(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
    expect(screen.getByText('항목 3개')).toBeInTheDocument();
  });

  it('검색 상자에서 Esc를 누르면 검색어를 지우고 원래 주소 줄로 돌아간다', async () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(screen.getByRole('button', { name: '검색' }));
    await user().keyboard('훅');
    await user().keyboard('{Escape}');
    expect(screen.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
    expect(screen.getByText('항목 3개')).toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('');
  });

  it('다른 위치로 가면 검색을 끝내고 원래 주소 줄로 돌아간다', async () => {
    const show = renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(screen.getByRole('button', { name: '검색' }));
    await user().keyboard('훅');
    show('folder:React');
    expect(screen.queryByRole('searchbox', { name: '검색' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('모바일은 폴더를 탭하면 같은 탭에서 그 폴더로 간다', async () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    await user().click(option('React'));
    expect(handleNavigate).toHaveBeenCalledWith('folder:React');
  });

  it('모바일은 항목을 끌어 옮기지 않는다', () => {
    renderBody(BLOG_FOLDER_ID, 'mobile');
    pointAt(option('React'));
    dragAndDrop(option('회고'));
    expect(namesIn(BLOG_FOLDER_ID)).toContain('회고');
  });
});
