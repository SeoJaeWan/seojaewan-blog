import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPostBodyCache } from '@/features/chrome/hooks/use-post-body/use-post-body';
import { useChromeZoomStore } from '@/features/chrome/stores/chrome-zoom-store/chrome-zoom-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import {
  type ChromeTabPage,
  createChromeContent,
  getActiveChromePage,
} from '@/shared/utils/chrome-tabs/chrome-tabs';

import { ChromeWindowLayer } from './chrome-window-layer';

const POSTS = [
  { slug: 'react-19-hooks', title: '리액트 19 훅 정리', folderPath: ['React'], date: '2026-10-20' },
  { slug: 'rsc', title: '리액트 서버 컴포넌트', folderPath: ['React'], date: '2026-10-12' },
  { slug: 'next-cache', title: 'Next.js 캐시', folderPath: ['Next.js'], date: '2026-09-01' },
] as const;

const WORK_AREA = { width: 1920, height: 1032 } as const;

const POINTER = { pointerId: 1, pointerType: 'mouse', button: 0 } as const;

const handleClose = vi.fn();

type HarnessProps = {
  /** 창 id */
  id: string;
  /** 화면 방식 */
  device?: 'desktop' | 'mobile';
};

/**
 * 창 저장소에서 창 내용을 읽어 Chrome 층을 그린다(창 층이 하는 일).
 * @param props
 * @returns Chrome 층
 */
function Harness(props: HarnessProps): JSX.Element | null {
  const { id, device = 'desktop' } = props;
  const target = useWindowStore((state) => state.windows[id]);
  if (target?.content.app !== 'chrome') {
    return null;
  }
  return (
    <ChromeWindowLayer
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
 * 페이지 하나를 보는 Chrome 창을 열어 그린다.
 * @param page 볼 페이지
 * @param device 화면 방식
 * @returns 창 id
 */
function renderChrome(
  page: ChromeTabPage = { kind: 'new-tab' },
  device?: 'desktop' | 'mobile',
): string {
  const id = useWindowStore.getState().open('chrome', WORK_AREA, createChromeContent(page));
  render(<Harness id={id} device={device} />);
  return id;
}

/**
 * 창이 지금 보는 페이지.
 * @param id 창 id
 * @returns 페이지
 */
function currentPage(id: string): ChromeTabPage | null {
  const content = useWindowStore.getState().windows[id]?.content;
  return content?.app === 'chrome' ? getActiveChromePage(content) : null;
}

/**
 * 주소창.
 * @returns 주소창 입력칸
 */
function addressBar(): HTMLElement {
  return screen.getByRole('combobox', { name: '주소 및 검색창' });
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
  vi.unstubAllGlobals();
  clearPostBodyCache();
  useChromeZoomStore.getState().resetZoom();
  useWindowStore.getState().reset();
  useWorkspaceStore.getState().reset();
  localStorage.clear();
});

/**
 * 탭의 닫기 버튼. 닫기 버튼은 탭(`role="tab"`) 옆, 탭 묶음 안에 있다.
 * @param tab 탭
 * @returns 닫기 버튼
 */
function closeButtonOf(tab: HTMLElement | undefined): HTMLElement {
  return within(tab?.parentElement ?? document.body).getByRole('button', { name: '탭 닫기' });
}

/**
 * 새 탭 두 개를 더 연다.
 */
async function openTwoNewTabs(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
  await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
}

// @codocs [[Chrome:구성]]
describe('Chrome:구성', () => {
  it('새 탭 버튼은 새 탭 페이지를 새 탭으로 열고 고른다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    expect(tabTitles()).toEqual(['리액트 서버 컴포넌트', '새 탭']);
    expect(screen.getByRole('tab', { name: /새 탭/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('탭을 누르면 그 탭으로 바꾼다', async () => {
    const id = renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    await userEvent.click(screen.getByRole('tab', { name: /리액트 서버 컴포넌트/ }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('고른 탭만 Tab 키로 닿는다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0]);
  });

  it('탭에서 ←를 누르면 앞 탭을 고르고 그 탭에 포커스를 옮긴다', async () => {
    const id = renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    act(() => {
      screen.getByRole('tab', { name: /새 탭/ }).focus();
    });
    await userEvent.keyboard('{ArrowLeft}');
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
    expect(screen.getByRole('tab', { name: /리액트 서버 컴포넌트/ })).toHaveFocus();
  });

  it('× 버튼으로 탭을 닫는다', async () => {
    renderChrome();
    await openTwoNewTabs();
    await userEvent.click(closeButtonOf(screen.getAllByRole('tab')[0]));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('탭을 가운데 클릭하면 그 탭을 닫는다', async () => {
    renderChrome();
    await openTwoNewTabs();
    fireEvent(
      screen.getAllByRole('tab')[0] ?? document.body,
      new MouseEvent('auxclick', { bubbles: true, button: 1 }),
    );
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('마지막 탭을 닫으면 창을 닫는다', async () => {
    renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '탭 닫기' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('탭을 끌어 순서를 바꾼다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
      this: Element,
    ) {
      const index =
        this.parentElement === null ? 0 : [...this.parentElement.children].indexOf(this);
      return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 34 });
    });
    const newTab = screen.getByRole('tab', { name: /새 탭/ });
    fireEvent.pointerDown(newTab, { ...POINTER, clientX: 150, clientY: 10 });
    fireEvent.pointerMove(newTab, { ...POINTER, clientX: 20, clientY: 10 });
    expect(tabTitles()).toEqual(['새 탭', '리액트 서버 컴포넌트']);
  });

  it('뒤로·앞으로는 기록이 없으면 비활성이다', () => {
    renderChrome();
    expect(screen.getByRole('button', { name: '뒤로' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '앞으로' })).toBeDisabled();
  });

  it('뒤로를 누르면 탭 기록의 앞 페이지로 간다', async () => {
    const id = renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    expect(currentPage(id)).toEqual({ kind: 'new-tab' });
  });

  it('앞으로를 누르면 탭 기록의 다음 페이지로 간다', async () => {
    const id = renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await userEvent.click(screen.getByRole('button', { name: '앞으로' }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('⋮ 메뉴의 링크 복사는 글을 보고 있으면 공유 링크를 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '링크 복사' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/posts/rsc`);
  });

  it('⋮ 메뉴의 링크 복사는 글을 보고 있지 않으면 비활성이다', async () => {
    renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(await screen.findByRole('menuitem', { name: '링크 복사' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('⋮ 메뉴는 링크 복사 · 페이지에서 찾기 · 확대/축소 줄이다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['링크 복사', '페이지에서 찾기Ctrl+F']);
    expect(screen.getByRole('group', { name: '확대/축소' })).toHaveTextContent('100%');
  });
});

// @codocs [[Chrome:페이지에서 찾기]]
describe('Chrome:페이지에서 찾기', () => {
  it('⋮ 메뉴의 페이지에서 찾기를 누르면 찾기 막대를 열고 입력칸에 포커스를 준다', async () => {
    renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /페이지에서 찾기/ }));
    expect(findInput()).toHaveFocus();
  });

  it('Chrome 창에 포커스가 있을 때 Ctrl+F로 열고 실제 브라우저의 찾기는 막는다', () => {
    renderChrome();
    const isNotPrevented = fireEvent.keyDown(addressBar(), { key: 'f', ctrlKey: true });
    expect(isNotPrevented).toBe(false);
    expect(findInput()).toHaveFocus();
  });

  it('이미 열려 있으면 Ctrl+F가 입력칸에 포커스를 주고 글자를 모두 선택한다', async () => {
    renderChrome();
    await openFindBar('리액트');
    addressBar().focus();
    fireEvent.keyDown(addressBar(), { key: 'f', ctrlKey: true });
    const input = findInput();
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, '리액트'.length]);
  });

  it('입력할 때마다 페이지 본문에서 찾아 `현재/전체` 개수를 보인다', async () => {
    renderChrome();
    await openFindBar('리액트');
    expect(findBar()).toHaveTextContent('1/2');
    await userEvent.clear(findInput());
    await userEvent.type(findInput(), '없는 글자');
    expect(findBar()).toHaveTextContent('0/0');
  });

  it('Enter·다음은 다음, Shift+Enter·이전은 이전이고 끝에 닿으면 처음으로 돌아간다', async () => {
    renderChrome();
    await openFindBar('리액트');
    await userEvent.keyboard('{Enter}');
    expect(findBar()).toHaveTextContent('2/2');
    await userEvent.keyboard('{Enter}');
    expect(findBar()).toHaveTextContent('1/2');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(findBar()).toHaveTextContent('2/2');
    await userEvent.click(screen.getByRole('button', { name: '다음 찾기' }));
    expect(findBar()).toHaveTextContent('1/2');
    await userEvent.click(screen.getByRole('button', { name: '이전 찾기' }));
    expect(findBar()).toHaveTextContent('2/2');
  });

  it('Esc나 닫기 버튼으로 닫는다', async () => {
    renderChrome();
    await openFindBar('리액트');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('search', { name: '페이지에서 찾기' })).not.toBeInTheDocument();
    await openFindBar('리액트');
    await userEvent.click(screen.getByRole('button', { name: '찾기 닫기' }));
    expect(screen.queryByRole('search', { name: '페이지에서 찾기' })).not.toBeInTheDocument();
  });

  it('다른 페이지로 가거나 탭을 바꾸면 닫는다', async () => {
    renderChrome();
    await openFindBar('리액트');
    await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
    expect(screen.queryByRole('search', { name: '페이지에서 찾기' })).not.toBeInTheDocument();
    await openFindBar('리액트');
    await userEvent.click(screen.getByRole('button', { name: '새 탭' }));
    expect(screen.queryByRole('search', { name: '페이지에서 찾기' })).not.toBeInTheDocument();
  });
});

// @codocs [[Chrome:확대/축소]]
describe('Chrome:확대/축소', () => {
  it('⋮ 메뉴의 −·+로 배율을 바꾸고 눌러도 메뉴가 닫히지 않는다', async () => {
    renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('button', { name: '확대' }));
    expect(zoomRow()).toHaveTextContent('110%');
    await userEvent.click(screen.getByRole('button', { name: '축소' }));
    await userEvent.click(screen.getByRole('button', { name: '축소' }));
    expect(zoomRow()).toHaveTextContent('90%');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('끝 단계에서는 그쪽 버튼이 비활성이다', async () => {
    act(() => {
      for (let step = 0; step < 6; step += 1) {
        useChromeZoomStore.getState().zoomIn();
      }
    });
    renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(await screen.findByRole('group', { name: '확대/축소' })).toHaveTextContent('200%');
    expect(screen.getByRole('button', { name: '확대' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '축소' })).toBeEnabled();
  });

  it('Ctrl + `+`·`-`·`0`으로 배율을 바꾸고 실제 브라우저의 확대는 막는다', () => {
    renderChrome();
    expect(fireEvent.keyDown(addressBar(), { key: '=', ctrlKey: true })).toBe(false);
    expect(useChromeZoomStore.getState().zoom).toBe(110);
    fireEvent.keyDown(addressBar(), { key: '-', ctrlKey: true });
    fireEvent.keyDown(addressBar(), { key: '-', ctrlKey: true });
    expect(useChromeZoomStore.getState().zoom).toBe(90);
    fireEvent.keyDown(addressBar(), { key: '0', ctrlKey: true });
    expect(useChromeZoomStore.getState().zoom).toBe(100);
  });

  it('페이지 본문만 키우고 모든 Chrome 창이 같은 배율을 쓴다', () => {
    renderChrome();
    renderChrome({ kind: 'search', query: '리액트' });
    act(() => {
      useChromeZoomStore.getState().zoomIn();
    });
    const zoomed = [...document.querySelectorAll<HTMLElement>('[style*="zoom"]')];
    expect(zoomed.map((element) => element.style.zoom)).toEqual(['1.1', '1.1']);
    expect(zoomed.every((element) => element.closest('[role="tablist"]') === null)).toBe(true);
  });
});

// @codocs [[Chrome:휴지통에 있는 글]]
describe('Chrome:휴지통에 있는 글', () => {
  it('휴지통에 있는 글 주소를 주소창에 넣으면 바로 열지 않고 복원할지 묻는다', async () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    const id = renderChrome();
    await userEvent.type(addressBar(), '/posts/rsc{Enter}');
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('휴지통에 있는 글');
    expect(dialog).toHaveTextContent('이 글은 휴지통에 있어요. 복원하고 열까요?');
    expect(currentPage(id)).toEqual({ kind: 'new-tab' });
  });

  it('복원을 누르면 그 글을 원래 위치로 돌려놓고 연다', async () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    const id = renderChrome();
    await userEvent.type(addressBar(), '/posts/rsc{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '복원' }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
    expect(useWorkspaceStore.getState().items['post:rsc']?.trash).toBeNull();
  });

  it('취소를 누르면 보던 페이지를 그대로 둔다', async () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    const id = renderChrome({ kind: 'search', query: '리액트' });
    await userEvent.type(addressBar(), '/posts/rsc{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '취소' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(currentPage(id)).toEqual({ kind: 'search', query: '리액트' });
    expect(useWorkspaceStore.getState().items['post:rsc']?.trash).not.toBeNull();
  });
});

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('본문 이미지를 누르면 페이지 영역을 덮어 크게 보고 포커스를 그 안으로 옮긴다', async () => {
    mockImageBody();
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(
      await screen.findByRole('button', { name: '이미지 크게 보기: 구조 그림' }),
    );
    const dialog = screen.getByRole('dialog', { name: '구조 그림' });
    expect(dialog).toHaveFocus();
    expect(screen.getByRole('tablist')).toBeVisible();
  });

  it('크게 보는 동안 Tab 키 포커스는 그 안에만 머문다', async () => {
    mockImageBody();
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.click(
      await screen.findByRole('button', { name: '이미지 크게 보기: 구조 그림' }),
    );
    const dialog = screen.getByRole('dialog', { name: '구조 그림' });
    const close = within(dialog).getByRole('button', { name: '닫기' });
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  it('Esc·닫기 버튼·이미지 밖 바탕으로 닫고, 닫으면 원래 이미지로 포커스를 돌린다', async () => {
    mockImageBody();
    renderChrome({ kind: 'post', slug: 'rsc' });
    const image = await screen.findByRole('button', { name: '이미지 크게 보기: 구조 그림' });
    await userEvent.click(image);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(image).toHaveFocus();
    await userEvent.click(image);
    await userEvent.click(
      within(screen.getByRole('dialog', { name: '구조 그림' })).getByRole('button', {
        name: '닫기',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(image);
    await userEvent.click(screen.getByRole('dialog', { name: '구조 그림' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(image).toHaveFocus();
  });

  it('찾기 막대가 열려 있으면 크게 보기가 그 위를 덮는다', async () => {
    mockImageBody();
    renderChrome({ kind: 'post', slug: 'rsc' });
    const image = await screen.findByRole('button', { name: '이미지 크게 보기: 구조 그림' });
    fireEvent.keyDown(addressBar(), { key: 'f', ctrlKey: true });
    await userEvent.click(image);
    const dialog = screen.getByRole('dialog', { name: '구조 그림' });
    expect(
      findBar().compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('다음 글은 휴지통에 있는 글을 건너뛴다', async () => {
    mockImageBody();
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    renderChrome({ kind: 'post', slug: 'next-cache' });
    expect(await screen.findByText('리액트 19 훅 정리')).toBeInTheDocument();
    expect(screen.queryByText('리액트 서버 컴포넌트')).not.toBeInTheDocument();
  });
});

/**
 * 서버 경로가 캡션 있는 이미지 하나의 본문을 돌려주게 한다.
 */
function mockImageBody(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          blocks: [
            {
              type: 'image',
              url: 'https://images.seojaewan.com/notion/a',
              caption: [{ text: '구조 그림', link: null }],
            },
          ],
        }),
      ),
    ),
  );
}

/**
 * 찾기 막대.
 * @returns 찾기 막대
 */
function findBar(): HTMLElement {
  return screen.getByRole('search', { name: '페이지에서 찾기' });
}

/**
 * 찾기 막대 입력칸.
 * @returns 입력칸
 */
function findInput(): HTMLInputElement {
  const input = within(findBar()).getByRole('searchbox');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('찾기 입력칸이 입력칸이 아니다');
  }
  return input;
}

/**
 * Ctrl+F로 찾기 막대를 열고 글자를 입력한다.
 * @param query 찾는 글자
 */
async function openFindBar(query: string): Promise<void> {
  fireEvent.keyDown(addressBar(), { key: 'f', ctrlKey: true });
  await userEvent.type(findInput(), query);
}

/**
 * ⋮ 메뉴의 확대/축소 줄.
 * @returns 확대/축소 줄
 */
function zoomRow(): HTMLElement {
  return screen.getByRole('group', { name: '확대/축소' });
}

// @codocs [[Chrome:새 탭 페이지]]
describe('Chrome:새 탭 페이지', () => {
  it('최신 글 바로가기에서 휴지통에 든 글은 뺀다', () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    renderChrome();
    expect(screen.queryByRole('button', { name: '리액트 서버 컴포넌트' })).not.toBeInTheDocument();
  });

  it('최신 글 바로가기를 누르면 같은 탭에서 그 글로 간다', async () => {
    const id = renderChrome();
    await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('검색창도 주소창과 같이 동작한다', async () => {
    const id = renderChrome();
    await userEvent.type(
      screen.getByRole('searchbox', { name: '글 검색 또는 URL 입력' }),
      '/posts/rsc{Enter}',
    );
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('검색창에 입력하면 주소창과 같은 추천 목록을 열고 ↓·Enter로 그 글을 연다', async () => {
    const id = renderChrome();
    const search = screen.getByRole('searchbox', { name: '글 검색 또는 URL 입력' });
    await userEvent.type(search, '리액');
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['리액트 19 훅 정리', '리액트 서버 컴포넌트', '리액 검색']);
    expect(search).not.toHaveAttribute('aria-activedescendant');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('검색창 추천을 누르면 그 글을 열고, Esc는 추천을 닫고 빈칸으로 돌린다', async () => {
    const id = renderChrome();
    const search = screen.getByRole('searchbox', { name: '글 검색 또는 URL 입력' });
    await userEvent.type(search, '리액');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(search).toHaveValue('');
    await userEvent.type(search, 'Next');
    await userEvent.click(screen.getByRole('option', { name: 'Next.js 캐시' }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'next-cache' });
  });
});

// @codocs [[Chrome:주소창]]
describe('Chrome:주소창', () => {
  it('평소에는 글 주소를 보인다', () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    expect(addressBar()).toHaveValue('seojaewan.com/posts/rsc');
  });

  it('새 탭 페이지에서는 비어 있다', () => {
    renderChrome();
    expect(addressBar()).toHaveValue('');
  });

  it('블로그 글 주소를 입력하고 Enter를 누르면 그 글로 간다', async () => {
    const id = renderChrome();
    await userEvent.type(addressBar(), 'seojaewan.com/posts/next-cache{Enter}');
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'next-cache' });
    expect(screen.getByRole('tab', { name: /Next.js 캐시/ })).toBeInTheDocument();
  });

  it('없는 글 주소는 찾을 수 없음 화면이다', async () => {
    const id = renderChrome();
    await userEvent.type(addressBar(), '/posts/none{Enter}');
    expect(currentPage(id)).toEqual({ kind: 'not-found', url: '/posts/none' });
    expect(
      screen.getByText('다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: /posts/none'),
    ).toBeVisible();
  });

  it('외부 주소는 실제 브라우저의 새 탭에서 열고 탭은 그대로다', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const id = renderChrome();
    await userEvent.type(addressBar(), 'https://github.com{Enter}');
    expect(open).toHaveBeenCalledWith('https://github.com/', '_blank', 'noopener');
    expect(currentPage(id)).toEqual({ kind: 'new-tab' });
  });

  it('그 밖의 글자는 탭 안에 검색 결과 페이지를 보인다', async () => {
    const id = renderChrome();
    await userEvent.type(addressBar(), '캐시{Enter}');
    expect(currentPage(id)).toEqual({ kind: 'search', query: '캐시' });
  });

  it('검색 결과 글을 누르면 같은 탭에서 그 글로 간다', async () => {
    const id = renderChrome({ kind: 'search', query: '캐시' });
    await userEvent.click(screen.getByRole('button', { name: /Next.js 캐시/ }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'next-cache' });
  });

  it('입력 중에는 추천 목록을 연다', async () => {
    renderChrome();
    await userEvent.type(addressBar(), '리액');
    const options = within(screen.getByRole('listbox', { name: '추천' })).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('리액트 19 훅 정리'),
      expect.stringContaining('리액트 서버 컴포넌트'),
      '리액 검색',
    ]);
  });

  it('추천 목록은 처음에 아무 추천도 고르지 않는다', async () => {
    renderChrome();
    await userEvent.type(addressBar(), '리액');
    const options = within(screen.getByRole('listbox', { name: '추천' })).getAllByRole('option');
    expect(options.every((option) => option.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('↓로 추천을 고르고 Enter를 누르면 현재 탭에서 그 글로 간다', async () => {
    const id = renderChrome();
    await userEvent.type(addressBar(), '리액');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });

  it('추천을 누르면 그 글로 간다', async () => {
    const id = renderChrome();
    await userEvent.type(addressBar(), '서버');
    await userEvent.click(screen.getByRole('option', { name: /리액트 서버 컴포넌트/ }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });

  it('Esc는 추천을 닫고 원래 주소로 돌린다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.type(addressBar(), '리액');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
    expect(addressBar()).toHaveValue('seojaewan.com/posts/rsc');
  });

  it('Esc로 돌린 원래 주소는 전체가 선택된다', async () => {
    renderChrome({ kind: 'post', slug: 'rsc' });
    await userEvent.type(addressBar(), '리액');
    await userEvent.keyboard('{Escape}');
    const input = addressBar();
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('주소창이 입력칸이 아니다');
    }
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
  });

  it('추천에서 휴지통에 든 글은 뺀다', async () => {
    act(() => {
      useWorkspaceStore.getState().trashItems(['post:rsc']);
    });
    renderChrome();
    await userEvent.type(addressBar(), '리액');
    expect(screen.queryByRole('option', { name: /리액트 서버 컴포넌트/ })).not.toBeInTheDocument();
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('모바일은 탭 줄이 없다', () => {
    renderChrome({ kind: 'new-tab' }, 'mobile');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('모바일 도구 모음에는 앞으로·새로고침 버튼이 없다', () => {
    renderChrome({ kind: 'new-tab' }, 'mobile');
    expect(screen.queryByRole('button', { name: '앞으로' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '새로고침' })).not.toBeInTheDocument();
  });

  it('모바일은 앞으로·새로고침이 ⋮ 메뉴 맨 위에 있다', async () => {
    renderChrome({ kind: 'new-tab' }, 'mobile');
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.slice(0, 2).map((item) => item.textContent)).toEqual(['앞으로', '새로고침']);
  });

  it('모바일 ⋮ 메뉴의 앞으로는 탭 기록의 다음 페이지로 간다', async () => {
    const id = renderChrome({ kind: 'new-tab' }, 'mobile');
    await userEvent.click(screen.getByRole('button', { name: '리액트 서버 컴포넌트' }));
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '앞으로' }));
    expect(currentPage(id)).toEqual({ kind: 'post', slug: 'rsc' });
  });
});
