import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import {
  APP_ITEM_IDS,
  BLOG_FOLDER_ID,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { useOpenItem } from './use-open-item';

const POSTS = [{ slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' }] as const;

beforeEach(() => {
  localStorage.clear();
  hydrateWorkspaceStore(POSTS);
});

afterEach(() => {
  useWindowStore.getState().reset();
  useWorkspaceStore.getState().reset();
  localStorage.clear();
  vi.restoreAllMocks();
});

/**
 * 항목 하나를 연다.
 * @param id 항목 id
 */
function openItem(id: string): void {
  const { result } = renderHook(() => useOpenItem());
  act(() => {
    result.current(id);
  });
}

/**
 * 열린 창들의 내용을 연 차례대로 돌려준다.
 * @returns 창 내용
 */
function windowContents(): unknown[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => windows[id]?.content);
}

// @codocs [[창 동작:열기 규칙]]
describe('창 동작:열기 규칙', () => {
  it('폴더를 열면 그 폴더를 보는 새 탐색기 창을 연다', () => {
    openItem('folder:React');
    openItem('folder:React');
    expect(windowContents()).toEqual([
      { app: 'file-explorer', folderId: 'folder:React' },
      { app: 'file-explorer', folderId: 'folder:React' },
    ]);
  });

  it('휴지통을 열면 휴지통을 보는 탐색기 창을 연다', () => {
    openItem(RECYCLE_BIN_ID);
    expect(windowContents()).toEqual([{ app: 'file-explorer', folderId: RECYCLE_BIN_ID }]);
  });

  it('글을 열면 Chrome 창이 없으면 새 창, 있으면 가장 최근 Chrome 창의 새 탭으로 연다', () => {
    openItem('post:a');
    openItem('post:a');
    expect(windowContents()).toEqual([
      {
        app: 'chrome',
        tabs: [
          { kind: 'post', slug: 'a' },
          { kind: 'post', slug: 'a' },
        ],
        activeTabIndex: 1,
      },
    ]);
  });

  it('새 창에서 열기는 열린 Chrome 창이 있어도 글을 새 Chrome 창으로 연다', () => {
    openItem('post:a');
    const { result } = renderHook(() => useOpenItem());
    act(() => {
      result.current('post:a', { isNewWindow: true });
    });
    expect(windowContents()).toEqual([
      { app: 'chrome', tabs: [{ kind: 'post', slug: 'a' }], activeTabIndex: 0 },
      { app: 'chrome', tabs: [{ kind: 'post', slug: 'a' }], activeTabIndex: 0 },
    ]);
  });

  it('외부 링크는 블로그 안의 창을 만들지 않고 실제 브라우저의 새 탭으로 연다', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openItem('link:github');
    expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
    expect(useWindowStore.getState().order).toHaveLength(0);
  });

  it('앱 항목을 열면 그 앱의 새 창을 연다', () => {
    openItem(APP_ITEM_IDS.chrome);
    expect(windowContents()).toEqual([
      { app: 'chrome', tabs: [{ kind: 'new-tab' }], activeTabIndex: 0 },
    ]);
  });

  it('휴지통 안의 항목은 열지 않는다', () => {
    useWorkspaceStore.getState().trashItems(['post:a']);
    openItem('post:a');
    expect(useWindowStore.getState().order).toHaveLength(0);
  });
});

// @codocs [[검색:입력 전 화면]]
describe('검색:입력 전 화면', () => {
  it('연 항목을 최근 항목에 넣고, 휴지통과 앱은 넣지 않는다', () => {
    openItem(BLOG_FOLDER_ID);
    openItem('post:a');
    openItem(RECYCLE_BIN_ID);
    openItem(APP_ITEM_IDS.chrome);
    expect(useWorkspaceStore.getState().recentItemIds).toEqual(['post:a', BLOG_FOLDER_ID]);
  });
});
