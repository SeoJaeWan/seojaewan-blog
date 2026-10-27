import { beforeEach, describe, expect, it } from 'vitest';

import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';
import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  getDesktopItems,
  isItemInTrash,
  toSavedWorkspace,
} from '@/shared/utils/workspace-rules/workspace-rules';
import {
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORAGE_VERSION,
} from '@/shared/utils/workspace-storage/workspace-storage';

import { externalLinks } from './external-links';
import { hydrateWorkspaceStore, useWorkspaceStore } from './workspace-store';

const POSTS = [{ slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' }] as const;

/**
 * 저장분을 localStorage에 넣는다.
 * @param state 저장할 상태(저장 형태)
 * @param version 저장 버전
 */
function writeStorage(state: unknown, version: number = WORKSPACE_STORAGE_VERSION): void {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ state, version }));
}

/**
 * 글 색인으로 만든 초기 구조의 저장 형태를 돌려준다.
 * @returns 저장 형태
 */
function initialSaved(): ReturnType<typeof toSavedWorkspace> {
  return toSavedWorkspace(createInitialWorkspace({ posts: POSTS, links: externalLinks }));
}

beforeEach(() => {
  useWorkspaceStore.getState().reset();
  localStorage.clear();
});

// @codocs [[작업 공간:방문자별 저장]]
describe('작업 공간:방문자별 저장', () => {
  it('수화하기 전에는 저장분을 읽지 않고 초기 구조로 그린다', () => {
    writeStorage({ ...initialSaved(), startAllView: 'grid' });
    expect(useWorkspaceStore.getState().startAllView).toBe('list');
  });

  it('수화하면 브라우저에 저장된 배치와 설정을 되살린다', () => {
    const saved = initialSaved();
    writeStorage({
      ...saved,
      items: {
        ...saved.items,
        [BLOG_FOLDER_ID]: { ...saved.items[BLOG_FOLDER_ID], name: '내 블로그' },
      },
      startAllView: 'grid',
    });
    hydrateWorkspaceStore(POSTS);
    const state = useWorkspaceStore.getState();
    expect(state.items[BLOG_FOLDER_ID]?.name).toBe('내 블로그');
    expect(state.startAllView).toBe('grid');
  });

  it('저장분이 없으면 서버가 넘긴 글 색인으로 초기 구조를 만든다', () => {
    hydrateWorkspaceStore(POSTS);
    expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBe('folder:React');
  });

  it('바꾼 상태는 localStorage에 저장한다', () => {
    hydrateWorkspaceStore(POSTS);
    useWorkspaceStore.getState().trashItems(['post:a']);
    const stored: unknown = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null');
    expect(stored).toMatchObject({
      version: WORKSPACE_STORAGE_VERSION,
      state: { items: { 'post:a': { parentId: 'recycle-bin' } } },
    });
  });

  it('저장분이 스키마에 맞지 않으면 초기 구조에서 다시 시작한다', () => {
    writeStorage({ ...initialSaved(), desktop: { iconSize: 'huge' } });
    hydrateWorkspaceStore(POSTS);
    expect(useWorkspaceStore.getState().items).toEqual(
      createInitialWorkspace({ posts: POSTS, links: externalLinks }).items,
    );
  });

  it('저장분의 버전이 다르면 초기 구조에서 다시 시작한다', () => {
    const saved = initialSaved();
    writeStorage({ ...saved, startAllView: 'grid' }, WORKSPACE_STORAGE_VERSION + 1);
    hydrateWorkspaceStore(POSTS);
    expect(useWorkspaceStore.getState().startAllView).toBe('list');
  });

  it('저장된 JSON이 깨져 있으면 초기 구조에서 다시 시작한다', () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, '{broken');
    hydrateWorkspaceStore(POSTS);
    expect(useWorkspaceStore.getState().items['post:a']?.parentId).toBe('folder:React');
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('다시 시작하면 폴더·배치·휴지통·설정을 처음 상태로 돌리고 브라우저 저장분을 지운다', () => {
    hydrateWorkspaceStore(POSTS);
    const store = useWorkspaceStore.getState();
    store.trashItems(['post:a']);
    store.createFolder(null);
    store.setDesktopIconSize('large');
    store.unpinFromTaskbar('chrome');
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).not.toBeNull();

    resetRegisteredStores();

    const state = useWorkspaceStore.getState();
    expect(isItemInTrash(state, 'post:a')).toBe(false);
    expect(getDesktopItems(state).map((item) => item.name)).toEqual([
      '휴지통',
      'Blog',
      'GitHub',
      '이력서',
    ]);
    expect(state.desktop.iconSize).toBe('medium');
    expect(state.taskbarPins).toEqual(['file-explorer', 'chrome']);
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });
});

// @codocs [[작업 공간:폴더 이름]]
describe('작업 공간:폴더 이름', () => {
  it('방문자가 만든 폴더는 UUID id를 받고, 거부된 조작은 이유를 돌려준다', () => {
    const result = useWorkspaceStore.getState().createFolder(null);
    expect(result.ok && /^[0-9a-f-]{36}$/.test(result.id)).toBe(true);
    expect(useWorkspaceStore.getState().renameFolder(BLOG_FOLDER_ID, 'CON')).toEqual({
      ok: false,
      reason: 'reserved-name',
    });
  });
});
