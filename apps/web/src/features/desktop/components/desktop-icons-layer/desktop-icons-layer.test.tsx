import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import { BLOG_FOLDER_ID, RECYCLE_BIN_ID } from '@/shared/utils/workspace-rules/workspace-rules';

import { DesktopIconsLayer } from './desktop-icons-layer';

const POSTS = [{ slug: 'a', title: '가', folderPath: [], date: '2026-10-20' }] as const;

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
    for (const name of ['휴지통', 'Blog', 'GitHub', '이력서']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('가')).not.toBeInTheDocument();
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
    await userEvent.dblClick(screen.getByText('Blog'));
    expect(windowContents()).toEqual([{ app: 'file-explorer', folderId: BLOG_FOLDER_ID }]);
  });

  it('휴지통 아이콘을 더블클릭하면 휴지통을 보는 탐색기 창을 연다', async () => {
    render(<DesktopIconsLayer />);
    await userEvent.dblClick(screen.getByText('휴지통'));
    expect(windowContents()).toEqual([{ app: 'file-explorer', folderId: RECYCLE_BIN_ID }]);
  });

  it('외부 링크 아이콘을 더블클릭하면 창을 만들지 않고 실제 브라우저의 새 탭으로 연다', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<DesktopIconsLayer />);
    await userEvent.dblClick(screen.getByText('GitHub'));
    expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
    expect(useWindowStore.getState().order).toHaveLength(0);
  });
});
