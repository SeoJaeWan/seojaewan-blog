import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  RECYCLE_BIN_ID,
  trashItems,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { getBreadcrumbMenuEntries, getSubfolderTargets } from './breadcrumb-menu-entries';

const workspace = createInitialWorkspace({
  posts: [
    { collection: 'blog', slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' },
    { collection: 'blog', slug: 'b', title: '나', folderPath: ['Next.js'], date: '2026-10-22' },
    { collection: 'blog', slug: 'c', title: '다', folderPath: [], date: '2026-10-21' },
  ],
  links: [],
});

const BY_NAME = { sortBy: 'name', sortDirection: 'asc' } as const;

/**
 * 메뉴 줄의 글자와 아이콘.
 * @param entries 메뉴 항목
 * @returns 글자와 아이콘
 */
function labels(entries: readonly MenuPopupEntry[]): unknown[] {
  return entries.map((entry) =>
    'label' in entry ? { label: entry.label, icon: entry.icon } : entry.kind,
  );
}

// @codocs [[파일 탐색기:구성]]
describe('getSubfolderTargets', () => {
  it('위치에 바로 든 폴더만 위치 아이콘과 함께 돌려준다(글은 뺀다)', () => {
    expect(getSubfolderTargets(workspace, BLOG_FOLDER_ID, BY_NAME)).toEqual([
      { location: 'folder:Next.js', name: 'Next.js', icon: 'images/file-folder' },
      { location: 'folder:React', name: 'React', icon: 'images/file-folder' },
    ]);
  });

  it('그 위치에 기억한 정렬(방향)을 따른다', () => {
    expect(
      getSubfolderTargets(workspace, BLOG_FOLDER_ID, { sortBy: 'name', sortDirection: 'desc' }).map(
        (target) => target.name,
      ),
    ).toEqual(['React', 'Next.js']);
  });

  it('바탕화면의 하위 폴더는 바탕화면 폴더다(휴지통은 빠진다)', () => {
    expect(
      getSubfolderTargets(workspace, null, BY_NAME).map((target) => target.location),
    ).not.toContain(RECYCLE_BIN_ID);
    expect(getSubfolderTargets(workspace, null, BY_NAME).map((target) => target.name)).toContain(
      'Blog',
    );
  });

  it('휴지통에 보낸 폴더는 보이지 않고, 휴지통은 하위 폴더가 없다', () => {
    const result = trashItems(workspace, ['folder:React'], '2026-10-28T09:00:00.000Z');
    if (!result.ok) {
      throw new Error(result.reason);
    }
    expect(
      getSubfolderTargets(result.state, BLOG_FOLDER_ID, BY_NAME).map((target) => target.name),
    ).toEqual(['Next.js']);
    expect(getSubfolderTargets(result.state, RECYCLE_BIN_ID, BY_NAME)).toEqual([]);
  });
});

// @codocs [[파일 탐색기:구성]]
describe('getBreadcrumbMenuEntries', () => {
  it('줄마다 위치 이름과 아이콘을 보이고, 고르면 그 위치로 간다', () => {
    const onNavigate = vi.fn();
    const entries = getBreadcrumbMenuEntries(
      [
        { location: null, name: '바탕 화면', icon: 'icons/ic_fluent_desktop_20_regular.svg' },
        { location: RECYCLE_BIN_ID, name: '휴지통', icon: 'images/file-recycle-bin-empty' },
      ],
      onNavigate,
    );
    expect(labels(entries)).toEqual([
      { label: '바탕 화면', icon: 'icons/ic_fluent_desktop_20_regular.svg' },
      { label: '휴지통', icon: 'images/file-recycle-bin-empty' },
    ]);
    const [, recycleBin] = entries;
    if (recycleBin?.kind !== undefined && recycleBin.kind !== 'command') {
      throw new Error('명령 항목이 아니다');
    }
    recycleBin?.onClick?.();
    expect(onNavigate).toHaveBeenCalledWith(RECYCLE_BIN_ID);
  });
});
