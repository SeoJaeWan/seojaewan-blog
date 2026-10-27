import { describe, expect, it } from 'vitest';

import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  renameFolder,
  toSavedWorkspace,
  type WorkspaceCatalog,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { restoreWorkspace } from './workspace-storage';

const catalog: WorkspaceCatalog = {
  posts: [{ slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' }],
  links: [],
};

// @codocs [[작업 공간:Notion과 맞추기]]
describe('작업 공간:Notion과 맞추기', () => {
  it('저장분이 없으면 초기 구조에서 시작한다', () => {
    expect(restoreWorkspace(undefined, catalog)).toEqual(createInitialWorkspace(catalog));
  });

  it('저장된 상태가 깨져 있어 읽을 수 없으면 초기 구조에서 다시 시작한다', () => {
    const initial = createInitialWorkspace(catalog);
    expect(restoreWorkspace({ items: 'broken' }, catalog)).toEqual(initial);
    expect(
      restoreWorkspace({ ...toSavedWorkspace(initial), startAllView: 'tiles' }, catalog),
    ).toEqual(initial);
  });

  it('스키마에 맞는 저장분은 그 배치를 되살린다', () => {
    const initial = createInitialWorkspace(catalog);
    const renamed = renameFolder(initial, BLOG_FOLDER_ID, '내 블로그');
    if (!renamed.ok) {
      throw new Error(renamed.reason);
    }
    const saved: unknown = JSON.parse(JSON.stringify(toSavedWorkspace(renamed.state)));
    expect(restoreWorkspace(saved, catalog)).toEqual(renamed.state);
  });
});
