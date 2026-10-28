import { describe, expect, it } from 'vitest';

import {
  APP_ITEM_IDS,
  BLOG_FOLDER_ID,
  createFolder,
  createInitialWorkspace,
  filterFolderNameInput,
  getChildItems,
  getDesktopItems,
  getExplorerView,
  getFolderNameToCommit,
  getFolderPath,
  getFolderTree,
  getItemOpenAction,
  getLatestPosts,
  getNewFolderName,
  getPasteIds,
  getRecentItems,
  getVisibleStartPins,
  isItemInTrash,
  isRecycleBinFull,
  moveItems,
  moveStartPin,
  moveTaskbarPin,
  pinToStart,
  pinToTaskbar,
  type PlacedItem,
  reconcileWorkspace,
  recordRecentItem,
  RECYCLE_BIN_ID,
  renameFolder,
  repairWorkspace,
  restoreItems,
  setDesktopIconPositions,
  setExplorerView,
  toSavedWorkspace,
  trashItems,
  unpinFromStart,
  unpinFromTaskbar,
  validateFolderName,
  type WorkspaceResult,
  type WorkspaceState,
} from './workspace-rules';
import { GITHUB_LINK, NOW, testCatalog } from './workspace-rules.fixture';

const initial = createInitialWorkspace(testCatalog);

/**
 * 성공한 결과의 상태를 꺼낸다. 거부됐으면 테스트를 실패시킨다.
 * @param result 규칙 결과
 * @returns 바뀐 상태
 */
function expectOk(result: WorkspaceResult): WorkspaceState {
  if (!result.ok) {
    throw new Error(`거부됨: ${result.reason}`);
  }
  return result.state;
}

/**
 * 초기 상태의 항목을 꺼낸다. 없으면 테스트를 실패시킨다.
 * @param id 항목 id
 * @returns 항목
 */
function itemOf(id: string): PlacedItem {
  const item = initial.items[id];
  if (item === undefined || item.kind === 'recycle-bin') {
    throw new Error(`없는 항목: ${id}`);
  }
  return item;
}

/**
 * 위치에 있는 항목 이름을 돌려준다.
 * @param state 작업 공간 상태
 * @param parentId 위치
 * @returns 이름들
 */
function namesIn(state: WorkspaceState, parentId: string | null): string[] {
  return getChildItems(state, parentId).map((item) => item.name);
}

// @codocs [[작업 공간:초기 구조]]
describe('작업 공간:초기 구조', () => {
  it('바탕화면에 휴지통과 Blog 폴더를 두고, 외부 링크는 설정한 초기 위치에 둔다', () => {
    expect(namesIn(initial, null)).toEqual(['휴지통', 'Blog', 'GitHub']);
    expect(initial.items['link:side']?.parentId).toBe(BLOG_FOLDER_ID);
  });

  it('글의 폴더 속성으로 Blog 아래에 폴더를 만들고 하위 폴더는 경로로 만든다', () => {
    expect(namesIn(initial, BLOG_FOLDER_ID)).toEqual([
      'React',
      'Next.js',
      '사이드 프로젝트',
      '2026 상반기 회고',
    ]);
    expect(namesIn(initial, 'folder:React')).toEqual(['Hooks', 'React 19 훅 정리']);
    expect(namesIn(initial, 'folder:React/Hooks')).toEqual(['useEffect 정리']);
  });

  it('폴더 속성이 비어 있는 글은 Blog 폴더에 넣는다', () => {
    expect(initial.items['post:retrospective']?.parentId).toBe(BLOG_FOLDER_ID);
  });

  it('외부 링크의 초기 위치가 없으면 바탕화면에 둔다', () => {
    const state = createInitialWorkspace({
      posts: [],
      links: [{ ...GITHUB_LINK, id: 'lost', initialParentId: 'folder:없음' }],
    });
    expect(state.items['link:lost']?.parentId).toBeNull();
  });
});

// @codocs [[항목 모델:식별]]
describe('항목 모델:식별', () => {
  it('글은 post:<slug>, Notion 폴더는 경로 기반, 외부 링크는 link:<설정 id>를 id로 쓴다', () => {
    expect(Object.keys(initial.items)).toEqual(
      expect.arrayContaining([
        'post:react-19-hooks',
        'folder:React',
        'folder:React/Hooks',
        'link:github',
      ]),
    );
  });

  it('폴더 이름을 바꿔도 id는 그대로다', () => {
    const state = expectOk(renameFolder(initial, 'folder:React', '리액트'));
    expect(state.items['folder:React']?.name).toBe('리액트');
  });
});

// @codocs [[Start 메뉴:고정됨]]
describe('Start 메뉴:고정됨', () => {
  it('처음에는 File Explorer, Chrome, Blog 폴더, 처음부터 고정하도록 정한 외부 링크가 고정돼 있다', () => {
    expect(initial.startPins).toEqual([
      APP_ITEM_IDS['file-explorer'],
      APP_ITEM_IDS.chrome,
      BLOG_FOLDER_ID,
      'link:github',
    ]);
  });

  it('새로 고정한 항목은 맨 뒤에 추가하고, 이미 있으면 그대로다', () => {
    const state = pinToStart(initial, 'post:react-19-hooks');
    expect(state.startPins.at(-1)).toBe('post:react-19-hooks');
    expect(pinToStart(state, 'post:react-19-hooks')).toBe(state);
  });

  it('고정을 해제하고 순서를 바꿀 수 있다(맨 앞으로 이동은 0번 자리)', () => {
    expect(unpinFromStart(initial, BLOG_FOLDER_ID).startPins).not.toContain(BLOG_FOLDER_ID);
    expect(moveStartPin(initial, 'link:github', 0).startPins[0]).toBe('link:github');
  });

  it('휴지통에 들어간 항목은 고정됨에서 보이지 않고, 복원하면 다시 보인다', () => {
    const trashed = expectOk(trashItems(initial, ['link:github'], NOW));
    expect(getVisibleStartPins(trashed)).not.toContain('link:github');
    const restored = expectOk(restoreItems(trashed, ['link:github']));
    expect(getVisibleStartPins(restored)).toContain('link:github');
  });
});

// @codocs [[작업 표시줄:고정과 순서]]
describe('작업 표시줄:고정과 순서', () => {
  it('처음에는 File Explorer와 Chrome이 고정돼 있다', () => {
    expect(initial.taskbarPins).toEqual(['file-explorer', 'chrome']);
  });

  it('앱 고정을 해제하고 다시 고정하면 맨 뒤에 붙고, 순서를 바꿀 수 있다', () => {
    const unpinned = unpinFromTaskbar(initial, 'file-explorer');
    expect(unpinned.taskbarPins).toEqual(['chrome']);
    expect(pinToTaskbar(unpinned, 'file-explorer').taskbarPins).toEqual([
      'chrome',
      'file-explorer',
    ]);
    expect(moveTaskbarPin(initial, 'chrome', 0).taskbarPins).toEqual(['chrome', 'file-explorer']);
  });
});

// @codocs [[작업 공간:방문자별 저장]]
describe('작업 공간:방문자별 저장', () => {
  it('휴지통은 저장하지 않아, 휴지통에 보낸 항목은 원래 자리에 둔 채 저장한다', () => {
    const trashed = expectOk(trashItems(initial, ['folder:React', 'link:github'], NOW));
    const saved = toSavedWorkspace(trashed);
    expect(saved.items['folder:React']).toEqual({
      kind: 'folder',
      name: 'React',
      parentId: BLOG_FOLDER_ID,
      date: null,
    });
    expect(saved.items['link:github']).toEqual({ kind: 'link', parentId: null });
    const state = reconcileWorkspace(saved, testCatalog);
    expect(isRecycleBinFull(state)).toBe(false);
    expect(state.items['post:use-effect']?.parentId).toBe('folder:React/Hooks');
  });

  it('휴지통에 보낸 Blog 폴더도 다시 들어오면 바탕화면에 돌아온다', () => {
    const trashed = expectOk(trashItems(initial, [BLOG_FOLDER_ID], NOW));
    const state = reconcileWorkspace(toSavedWorkspace(trashed), testCatalog);
    expect(state.items[BLOG_FOLDER_ID]).toMatchObject({ parentId: null, trash: null });
  });

  it('돌아올 자리에 같은 이름의 폴더가 생겼으면 복원처럼 번호를 붙여 저장한다', () => {
    const trashed = expectOk(trashItems(initial, ['folder:React'], NOW));
    const created = expectOk(createFolder(trashed, BLOG_FOLDER_ID, { id: 'v1', createdAt: NOW }));
    const renamed = expectOk(renameFolder(created, 'v1', 'React'));
    expect(toSavedWorkspace(renamed).items['folder:React']).toMatchObject({
      name: 'React (2)',
      parentId: BLOG_FOLDER_ID,
    });
  });
});

// @codocs [[작업 공간:Notion과 맞추기]]
describe('작업 공간:Notion과 맞추기', () => {
  const saved = toSavedWorkspace(initial);

  it('새 글은 그 글의 폴더 속성에 해당하는 폴더로 들어간다', () => {
    const state = reconcileWorkspace(saved, {
      ...testCatalog,
      posts: [
        ...testCatalog.posts,
        { slug: 'new', title: '새 글', folderPath: ['React'], date: '2026-10-27' },
      ],
    });
    expect(state.items['post:new']?.parentId).toBe('folder:React');
  });

  it('폴더는 id로 찾아, 방문자가 이름을 바꾸고 옮긴 폴더에도 새 글이 들어간다', () => {
    const renamed = expectOk(renameFolder(initial, 'folder:React', '리액트'));
    const moved = expectOk(moveItems(renamed, ['folder:React'], null, NOW));
    const state = reconcileWorkspace(toSavedWorkspace(moved), {
      ...testCatalog,
      posts: [
        ...testCatalog.posts,
        { slug: 'new', title: '새 글', folderPath: ['React'], date: '2026-10-27' },
      ],
    });
    expect(state.items['post:new']?.parentId).toBe('folder:React');
  });

  it('새 글의 폴더가 없으면 Blog 폴더로 들어간다', () => {
    const state = reconcileWorkspace(saved, {
      ...testCatalog,
      posts: [
        ...testCatalog.posts,
        { slug: 'b', title: '나', folderPath: ['없는 폴더'], date: '2026-10-27' },
      ],
    });
    expect(state.items['post:b']?.parentId).toBe(BLOG_FOLDER_ID);
  });

  it('방문자가 옮겨 둔 기존 글은 Notion의 폴더 속성 위치로 되돌리지 않는다', () => {
    const moved = expectOk(moveItems(initial, ['post:react-19-hooks'], null, NOW));
    const state = reconcileWorkspace(toSavedWorkspace(moved), testCatalog);
    expect(state.items['post:react-19-hooks']?.parentId).toBeNull();
  });

  it('제목과 작성일은 지금 Notion 값을 따른다', () => {
    const state = reconcileWorkspace(saved, {
      ...testCatalog,
      posts: testCatalog.posts.map((post) =>
        post.slug === 'react-19-hooks' ? { ...post, title: '바뀐 제목', date: '2026-10-21' } : post,
      ),
    });
    expect(state.items['post:react-19-hooks']).toMatchObject({
      name: '바뀐 제목',
      date: '2026-10-21',
    });
  });

  it('Notion에서 사라진 글과 설정에서 사라진 외부 링크는 상태에서도 지운다', () => {
    const pinned = pinToStart(initial, 'post:nextjs-cache');
    const state = reconcileWorkspace(toSavedWorkspace(pinned), {
      posts: testCatalog.posts.filter((post) => post.slug !== 'nextjs-cache'),
      links: testCatalog.links.filter((link) => link.id !== 'github'),
    });
    expect(state.items['post:nextjs-cache']).toBeUndefined();
    expect(state.items['link:github']).toBeUndefined();
    expect(state.startPins).not.toContain('post:nextjs-cache');
    expect(state.startPins).not.toContain('link:github');
  });

  it('설정에 새로 생긴 외부 링크는 초기 위치에 둔다', () => {
    const state = reconcileWorkspace(saved, {
      ...testCatalog,
      links: [...testCatalog.links, { ...GITHUB_LINK, id: 'resume', name: '이력서' }],
    });
    expect(state.items['link:resume']?.parentId).toBeNull();
  });

  it('상위 폴더가 없는 항목은 바탕화면으로 옮긴다', () => {
    const broken = {
      ...saved,
      items: {
        ...saved.items,
        'post:react-19-hooks': { kind: 'post', parentId: 'folder:없음' },
      },
    } as const;
    expect(
      reconcileWorkspace(broken, testCatalog).items['post:react-19-hooks']?.parentId,
    ).toBeNull();
  });

  it('글 id를 차지한 폴더는 버리고, 그 하위 항목은 지우지 않고 바탕화면으로 옮긴다', () => {
    const broken = {
      ...saved,
      items: {
        ...saved.items,
        'post:react-19-hooks': { kind: 'folder', name: '가짜', parentId: null, date: null },
        c1: { kind: 'folder', name: '하위', parentId: 'post:react-19-hooks', date: null },
      },
    } as const;
    const state = reconcileWorkspace(broken, testCatalog);
    expect(state.items['post:react-19-hooks']).toMatchObject({
      kind: 'post',
      name: 'React 19 훅 정리',
    });
    expect(state.items.c1).toMatchObject({ kind: 'folder', parentId: null });
  });

  it('Blog 폴더가 저장분에 없으면 바탕화면에 다시 둔다', () => {
    const items = Object.fromEntries(
      Object.entries(saved.items).filter(([id]) => id !== BLOG_FOLDER_ID),
    );
    const state = reconcileWorkspace({ ...saved, items }, testCatalog);
    expect(state.items[BLOG_FOLDER_ID]).toMatchObject({ kind: 'folder', parentId: null });
  });

  it('방문자가 만든 폴더와 그 이름, 바탕화면 설정은 그대로 남는다', () => {
    const created = expectOk(createFolder(initial, null, { id: 'v1', createdAt: NOW }));
    const state = reconcileWorkspace(
      toSavedWorkspace({ ...created, desktop: { ...created.desktop, iconSize: 'large' } }),
      testCatalog,
    );
    expect(state.items.v1).toMatchObject({ name: '새 폴더', parentId: null, date: NOW });
    expect(state.desktop.iconSize).toBe('large');
  });
});

// @codocs [[작업 공간:Notion과 맞추기]]
describe('작업 공간:Notion과 맞추기 - 깨진 상태 복구', () => {
  it('상위로 올라가다 자기에게 돌아오는 폴더는 바탕화면으로 옮긴다', () => {
    const items = {
      ...initial.items,
      'folder:React': { ...itemOf('folder:React'), parentId: 'folder:React/Hooks' },
    };
    const state = repairWorkspace({ ...initial, items });
    expect(state.items['folder:React']?.parentId).toBeNull();
    expect(state.items['folder:React/Hooks']?.parentId).toBe('folder:React');
  });

  it('휴지통 기록 없이 휴지통에 있는 항목은 바탕화면으로, 휴지통 밖에 있는데 기록이 있으면 기록을 지운다', () => {
    const items = {
      ...initial.items,
      'post:react-19-hooks': { ...itemOf('post:react-19-hooks'), parentId: RECYCLE_BIN_ID },
      'post:use-effect': {
        ...itemOf('post:use-effect'),
        trash: { originalParentId: null, deletedAt: NOW },
      },
    };
    const state = repairWorkspace({ ...initial, items });
    expect(state.items['post:react-19-hooks']?.parentId).toBeNull();
    expect(state.items['post:use-effect']?.trash).toBeNull();
  });

  it('없는 항목을 가리키는 최근 항목, 아이콘 칸, 폴더 보기를 지운다', () => {
    const state = repairWorkspace({
      ...initial,
      recentItemIds: ['post:없음', BLOG_FOLDER_ID],
      desktop: { ...initial.desktop, positions: { 'post:없음': { column: 0, row: 0 } } },
      explorerViews: { 'folder:없음': { view: 'details', sortBy: 'name', sortDirection: 'asc' } },
    });
    expect(state.recentItemIds).toEqual([BLOG_FOLDER_ID]);
    expect(state.desktop.positions).toEqual({});
    expect(state.explorerViews).toEqual({});
  });

  it('휴지통 보기의 정렬은 지우지 않는다', () => {
    const view = { view: 'details', sortBy: 'modified', sortDirection: 'desc' } as const;
    const state = repairWorkspace({ ...initial, explorerViews: { [RECYCLE_BIN_ID]: view } });
    expect(state.explorerViews).toEqual({ [RECYCLE_BIN_ID]: view });
  });
});

// @codocs [[작업 공간:폴더 이름]]
describe('작업 공간:폴더 이름', () => {
  it('비어 있거나 공백만 있으면 안 된다', () => {
    expect(validateFolderName('', [])).toEqual({ ok: false, reason: 'empty' });
    expect(validateFolderName('   ', [])).toEqual({ ok: false, reason: 'empty' });
  });

  it('최대 255자다', () => {
    expect(validateFolderName('가'.repeat(255), [])).toEqual({ ok: true });
    expect(validateFolderName('가'.repeat(256), [])).toEqual({ ok: false, reason: 'too-long' });
  });

  it.each(['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\u0001', '\t'])(
    '%j 문자를 쓸 수 없다',
    (character) => {
      expect(validateFolderName(`a${character}b`, [])).toEqual({
        ok: false,
        reason: 'invalid-character',
      });
    },
  );

  it.each(['.', '..', 'CON', 'con', 'Nul.txt', 'COM1', 'lpt9.md', 'aux'])(
    '예약 이름 %s은 대소문자와 확장자에 관계없이 쓸 수 없다',
    (name) => {
      expect(validateFolderName(name, [])).toEqual({ ok: false, reason: 'reserved-name' });
    },
  );

  it('COM0, CONSOLE처럼 예약 이름이 아닌 것은 쓸 수 있다', () => {
    expect(validateFolderName('COM0', [])).toEqual({ ok: true });
    expect(validateFolderName('CONSOLE', [])).toEqual({ ok: true });
  });

  it('이름 끝의 공백과 마침표는 쓸 수 없다', () => {
    expect(validateFolderName('폴더 ', [])).toEqual({ ok: false, reason: 'trailing-space-or-dot' });
    expect(validateFolderName('폴더.', [])).toEqual({ ok: false, reason: 'trailing-space-or-dot' });
  });

  it('같은 위치에는 대소문자와 유니코드 정규화 차이를 무시하고 같은 이름을 둘 수 없다', () => {
    expect(validateFolderName('react', ['React'])).toEqual({ ok: false, reason: 'duplicate' });
    const decomposed = '한'.normalize('NFD');
    expect(validateFolderName('한', [decomposed])).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('다른 위치에서는 같은 이름을 쓸 수 있다', () => {
    const state = expectOk(renameFolder(initial, 'folder:React/Hooks', 'Next.js'));
    expect(state.items['folder:React/Hooks']?.name).toBe('Next.js');
  });

  it('같은 위치의 다른 폴더 이름으로는 바꿀 수 없다', () => {
    expect(renameFolder(initial, 'folder:React', 'next.js')).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });

  it('새 폴더의 기본 이름은 새 폴더이고, 있으면 가장 작은 빈 번호를 쓴다', () => {
    expect(getNewFolderName([])).toBe('새 폴더');
    expect(getNewFolderName(['새 폴더'])).toBe('새 폴더 (2)');
    expect(getNewFolderName(['새 폴더', '새 폴더 (3)'])).toBe('새 폴더 (2)');
    expect(getNewFolderName(['새 폴더', '새 폴더 (2)'])).toBe('새 폴더 (3)');
  });

  it('새 폴더를 만들면 만든 시각을 날짜로 갖고, 같은 위치에 이어 만들면 번호가 붙는다', () => {
    const first = expectOk(createFolder(initial, BLOG_FOLDER_ID, { id: 'v1', createdAt: NOW }));
    const second = expectOk(createFolder(first, BLOG_FOLDER_ID, { id: 'v2', createdAt: NOW }));
    expect(second.items.v1).toMatchObject({ name: '새 폴더', date: NOW, parentId: BLOG_FOLDER_ID });
    expect(second.items.v2?.name).toBe('새 폴더 (2)');
  });

  it('입력하는 순간 쓸 수 없는 문자를 빼고, 뺐는지 알려 준다', () => {
    expect(filterFolderNameInput('a/b:c')).toEqual({
      value: 'abc',
      hasRemovedInvalidCharacter: true,
    });
    expect(filterFolderNameInput('a\u0001b')).toEqual({
      value: 'ab',
      hasRemovedInvalidCharacter: true,
    });
    expect(filterFolderNameInput('React')).toEqual({
      value: 'React',
      hasRemovedInvalidCharacter: false,
    });
  });

  it('255자를 넘게는 입력되지 않고, 서로게이트 쌍을 가르지 않는다', () => {
    expect(filterFolderNameInput('가'.repeat(300)).value).toHaveLength(255);
    expect(filterFolderNameInput(`${'a'.repeat(254)}😀`).value).toBe('a'.repeat(254));
  });

  it('끝의 공백과 마침표는 잘라내고 확정하며, 비었거나 공백만 있으면 되돌린다', () => {
    expect(getFolderNameToCommit('메모. . ')).toBe('메모');
    expect(getFolderNameToCommit(' 메모')).toBe(' 메모');
    expect(getFolderNameToCommit('')).toBeNull();
    expect(getFolderNameToCommit('   ')).toBeNull();
    expect(getFolderNameToCommit('...')).toBeNull();
  });

  it('글, 외부 링크, 휴지통은 이름을 바꿀 수 없다', () => {
    expect(renameFolder(initial, 'post:react-19-hooks', '가')).toEqual({
      ok: false,
      reason: 'protected',
    });
    expect(renameFolder(initial, RECYCLE_BIN_ID, '가')).toEqual({ ok: false, reason: 'protected' });
  });
});

// @codocs [[작업 공간:배치]]
describe('작업 공간:배치', () => {
  it('폴더, 글, 외부 링크를 바탕화면이나 어느 폴더에나 옮길 수 있다', () => {
    const state = expectOk(
      moveItems(
        initial,
        ['folder:Next.js', 'post:react-19-hooks', 'link:github'],
        'folder:React/Hooks',
        NOW,
      ),
    );
    expect(namesIn(state, 'folder:React/Hooks')).toEqual(
      expect.arrayContaining(['Next.js', 'React 19 훅 정리', 'GitHub']),
    );
  });

  it('폴더를 자기 자신이나 하위 폴더 안으로 옮길 수 없다', () => {
    expect(moveItems(initial, ['folder:React'], 'folder:React', NOW)).toEqual({
      ok: false,
      reason: 'into-itself',
    });
    expect(moveItems(initial, ['folder:React'], 'folder:React/Hooks', NOW)).toEqual({
      ok: false,
      reason: 'into-descendant',
    });
  });

  it('옮길 위치에 같은 이름의 폴더가 있으면 거부하고 아무것도 옮기지 않는다', () => {
    const created = expectOk(createFolder(initial, null, { id: 'v1', createdAt: NOW }));
    const renamed = expectOk(renameFolder(created, 'v1', 'react'));
    expect(moveItems(renamed, ['v1'], BLOG_FOLDER_ID, NOW)).toEqual({
      ok: false,
      reason: 'name-conflict',
    });
  });

  it('휴지통은 옮길 수 없고, 휴지통 안의 항목은 복원으로만 꺼낸다', () => {
    expect(moveItems(initial, [RECYCLE_BIN_ID], BLOG_FOLDER_ID, NOW)).toEqual({
      ok: false,
      reason: 'protected',
    });
    const trashed = expectOk(trashItems(initial, ['post:nextjs-cache'], NOW));
    expect(moveItems(trashed, ['post:nextjs-cache'], null, NOW)).toEqual({
      ok: false,
      reason: 'in-trash',
    });
  });

  it('휴지통 위로 옮기면 휴지통으로 보낸다', () => {
    const state = expectOk(moveItems(initial, ['link:github'], RECYCLE_BIN_ID, NOW));
    expect(isItemInTrash(state, 'link:github')).toBe(true);
  });

  it('바탕화면을 떠난 항목의 아이콘 칸은 지운다', () => {
    const placed = setDesktopIconPositions(initial, { 'link:github': { column: 2, row: 3 } });
    expect(placed.desktop.positions).toEqual({ 'link:github': { column: 2, row: 3 } });
    const moved = expectOk(moveItems(placed, ['link:github'], BLOG_FOLDER_ID, NOW));
    expect(moved.desktop.positions).toEqual({});
  });

  it('바탕화면에 없는 항목의 아이콘 칸은 정하지 않는다', () => {
    expect(
      setDesktopIconPositions(initial, { 'folder:React': { column: 0, row: 0 } }).desktop.positions,
    ).toEqual({});
  });

  it('폴더 경로와 바탕화면 아래의 폴더 트리를 돌려준다', () => {
    expect(getFolderPath(initial, 'folder:React/Hooks').map((folder) => folder.name)).toEqual([
      'Blog',
      'React',
      'Hooks',
    ]);
    const tree = getFolderTree(initial);
    expect(tree.map((node) => node.folder.name)).toEqual(['Blog']);
    expect(tree[0]?.children.map((node) => node.folder.name)).toEqual(['React', 'Next.js']);
  });

  it('휴지통 안의 폴더는 폴더 트리에서 뺀다', () => {
    const trashed = expectOk(trashItems(initial, ['folder:Next.js'], NOW));
    expect(getFolderTree(trashed)[0]?.children.map((node) => node.folder.name)).toEqual(['React']);
  });

  it('잘라낸 항목을 붙여넣을 위치로 옮길 수 있으면 붙여넣을 항목을 돌려준다', () => {
    expect(getPasteIds(initial, ['link:github', 'folder:Next.js'], 'folder:React', NOW)).toEqual([
      'link:github',
      'folder:Next.js',
    ]);
  });

  it('그사이 휴지통에 들어갔거나 사라진 항목은 빼고 붙인다', () => {
    const trashed = expectOk(trashItems(initial, ['post:nextjs-cache'], NOW));
    expect(
      getPasteIds(trashed, ['post:nextjs-cache', 'post:없음', 'link:github'], 'folder:React', NOW),
    ).toEqual(['link:github']);
  });

  it('붙여넣을 것이 없거나 옮길 수 없으면 붙여넣을 수 없다', () => {
    expect(getPasteIds(initial, [], null, NOW)).toBeNull();
    expect(getPasteIds(initial, ['link:github'], null, NOW)).toBeNull();
    expect(getPasteIds(initial, ['folder:React'], 'folder:React/Hooks', NOW)).toBeNull();
    expect(getPasteIds(initial, ['link:github'], RECYCLE_BIN_ID, NOW)).toBeNull();
  });
});

// @codocs [[작업 공간:휴지통]]
describe('작업 공간:휴지통', () => {
  it('폴더를 보내면 안의 항목도 함께 휴지통에 간다', () => {
    const state = expectOk(trashItems(initial, ['folder:React'], NOW));
    expect(isItemInTrash(state, 'folder:React')).toBe(true);
    expect(isItemInTrash(state, 'post:use-effect')).toBe(true);
    expect(state.items['folder:React']?.trash).toEqual({
      originalParentId: BLOG_FOLDER_ID,
      deletedAt: NOW,
    });
  });

  it('휴지통은 휴지통으로 보낼 수 없다', () => {
    expect(trashItems(initial, [RECYCLE_BIN_ID], NOW)).toEqual({ ok: false, reason: 'protected' });
  });

  it('Blog 폴더도 휴지통으로 보낼 수 있고, 안의 항목도 함께 간다', () => {
    const state = expectOk(trashItems(initial, [BLOG_FOLDER_ID], NOW));
    expect(state.items[BLOG_FOLDER_ID]?.parentId).toBe(RECYCLE_BIN_ID);
    expect(isItemInTrash(state, 'post:retrospective')).toBe(true);
  });

  it('Blog 폴더를 하위에 둔 폴더도 휴지통으로 보낼 수 있다', () => {
    const created = expectOk(createFolder(initial, null, { id: 'u1', createdAt: NOW }));
    const moved = expectOk(moveItems(created, [BLOG_FOLDER_ID], 'u1', NOW));
    const state = expectOk(moveItems(moved, ['u1'], RECYCLE_BIN_ID, NOW));
    expect(isItemInTrash(state, BLOG_FOLDER_ID)).toBe(true);
  });

  it('Blog 폴더는 이름 변경과 이동은 된다', () => {
    const renamed = expectOk(renameFolder(initial, BLOG_FOLDER_ID, '내 블로그'));
    const created = expectOk(createFolder(renamed, null, { id: 'v1', createdAt: NOW }));
    const moved = expectOk(moveItems(created, [BLOG_FOLDER_ID], 'v1', NOW));
    expect(moved.items[BLOG_FOLDER_ID]).toMatchObject({ name: '내 블로그', parentId: 'v1' });
  });

  it('휴지통에 항목이 하나라도 있으면 찬 모양이고, 모두 복원하면 빈 모양이다', () => {
    expect(isRecycleBinFull(initial)).toBe(false);
    const trashed = expectOk(trashItems(initial, ['link:github'], NOW));
    expect(isRecycleBinFull(trashed)).toBe(true);
    expect(isRecycleBinFull(expectOk(restoreItems(trashed, ['link:github'])))).toBe(false);
  });

  it('휴지통에서 복원하면 원래 위치로 돌아간다', () => {
    const trashed = expectOk(trashItems(initial, ['post:react-19-hooks'], NOW));
    const restored = expectOk(restoreItems(trashed, ['post:react-19-hooks']));
    expect(restored.items['post:react-19-hooks']).toMatchObject({
      parentId: 'folder:React',
      trash: null,
    });
  });

  it('원래 상위 폴더도 휴지통에 있으면 바탕화면으로 간다', () => {
    const postTrashed = expectOk(trashItems(initial, ['post:react-19-hooks'], NOW));
    const folderTrashed = expectOk(trashItems(postTrashed, ['folder:React'], NOW));
    const restored = expectOk(restoreItems(folderTrashed, ['post:react-19-hooks']));
    expect(restored.items['post:react-19-hooks']?.parentId).toBeNull();
  });

  it('원래 상위 폴더를 함께 복원하면 그 안으로 돌아간다', () => {
    const postTrashed = expectOk(trashItems(initial, ['post:react-19-hooks'], NOW));
    const folderTrashed = expectOk(trashItems(postTrashed, ['folder:React'], NOW));
    const restored = expectOk(restoreItems(folderTrashed, ['post:react-19-hooks', 'folder:React']));
    expect(restored.items['post:react-19-hooks']?.parentId).toBe('folder:React');
    expect(restored.items['folder:React']?.parentId).toBe(BLOG_FOLDER_ID);
  });

  it('복원할 자리에 같은 이름의 폴더가 생겼으면 번호를 붙여 돌려놓는다', () => {
    const trashed = expectOk(trashItems(initial, ['folder:React'], NOW));
    const created = expectOk(createFolder(trashed, BLOG_FOLDER_ID, { id: 'v1', createdAt: NOW }));
    const renamed = expectOk(renameFolder(created, 'v1', 'React'));
    const restored = expectOk(restoreItems(renamed, ['folder:React']));
    expect(restored.items['folder:React']?.name).toBe('React (2)');
  });

  it('휴지통에 바로 들어 있지 않은 항목은 복원할 수 없다', () => {
    expect(restoreItems(initial, ['link:github'])).toEqual({ ok: false, reason: 'not-in-trash' });
  });

  it('휴지통 안의 항목은 열 수 없고, 휴지통을 열면 휴지통 탐색기를 연다', () => {
    const trashed = expectOk(trashItems(initial, ['link:github'], NOW));
    expect(getItemOpenAction(trashed, 'link:github')).toEqual({ type: 'none' });
    expect(getItemOpenAction(trashed, RECYCLE_BIN_ID)).toEqual({
      type: 'explorer',
      folderId: RECYCLE_BIN_ID,
    });
  });

  it('휴지통에 보낸 항목은 휴지통 위치의 항목이다', () => {
    const trashed = expectOk(trashItems(initial, ['folder:React', 'post:use-effect'], NOW));
    expect(namesIn(trashed, RECYCLE_BIN_ID)).toEqual(['React']);
  });
});

// @codocs [[창 동작:열기 규칙]]
describe('창 동작:열기 규칙', () => {
  it('폴더는 그 폴더의 탐색기, 글은 Chrome, 외부 링크는 실제 브라우저의 새 탭, 앱은 그 앱 창이다', () => {
    expect(getItemOpenAction(initial, 'folder:React')).toEqual({
      type: 'explorer',
      folderId: 'folder:React',
    });
    expect(getItemOpenAction(initial, 'post:react-19-hooks')).toEqual({
      type: 'post',
      slug: 'react-19-hooks',
    });
    expect(getItemOpenAction(initial, 'link:github')).toEqual({
      type: 'external',
      url: 'https://github.com/SeoJaeWan',
    });
    expect(getItemOpenAction(initial, APP_ITEM_IDS.chrome)).toEqual({ type: 'app', app: 'chrome' });
    expect(getItemOpenAction(initial, '없음')).toEqual({ type: 'none' });
  });
});

// @codocs [[검색:입력 전 화면]]
describe('검색:입력 전 화면', () => {
  it('최근 연 항목은 최근 것부터 한 번씩 기억하고, 휴지통에 들어간 항목은 뺀다', () => {
    let state = recordRecentItem(initial, BLOG_FOLDER_ID);
    state = recordRecentItem(state, 'link:github');
    state = recordRecentItem(state, BLOG_FOLDER_ID);
    expect(getRecentItems(state, 5).map((item) => item.id)).toEqual([
      BLOG_FOLDER_ID,
      'link:github',
    ]);
    const trashed = expectOk(trashItems(state, ['link:github'], NOW));
    expect(getRecentItems(trashed, 5).map((item) => item.id)).toEqual([BLOG_FOLDER_ID]);
  });

  it('앱과 휴지통은 최근 항목에 넣지 않는다', () => {
    expect(recordRecentItem(initial, RECYCLE_BIN_ID)).toBe(initial);
    expect(recordRecentItem(initial, APP_ITEM_IDS.chrome)).toBe(initial);
  });

  it('최신 글은 작성일 최신순이고 휴지통에 들어간 글은 뺀다', () => {
    const trashed = expectOk(trashItems(initial, ['post:react-19-hooks'], NOW));
    expect(getLatestPosts(trashed, 2).map((post) => post.slug)).toEqual([
      'nextjs-cache',
      'use-effect',
    ]);
  });
});

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('기본 보기는 보통 아이콘, 기본 정렬은 이름 오름차순이다', () => {
    expect(getExplorerView(initial, BLOG_FOLDER_ID)).toEqual({
      view: 'medium',
      sortBy: 'name',
      sortDirection: 'asc',
    });
  });

  it('보기와 정렬은 폴더마다 따로 기억한다', () => {
    const state = setExplorerView(initial, BLOG_FOLDER_ID, { view: 'details' });
    expect(getExplorerView(state, BLOG_FOLDER_ID).view).toBe('details');
    expect(getExplorerView(state, 'folder:React').view).toBe('medium');
    expect(getExplorerView(setExplorerView(state, null, { sortDirection: 'desc' }), null)).toEqual({
      view: 'medium',
      sortBy: 'name',
      sortDirection: 'desc',
    });
  });
});

// @codocs [[바탕화면:표시하는 항목]]
describe('바탕화면:표시하는 항목', () => {
  it('상위 폴더가 없는 항목과 휴지통을 보여 주고, 폴더 안으로 옮기면 사라진다', () => {
    expect(getDesktopItems(initial).map((item) => item.id)).toEqual([
      RECYCLE_BIN_ID,
      BLOG_FOLDER_ID,
      'link:github',
    ]);
    const moved = expectOk(moveItems(initial, ['link:github'], BLOG_FOLDER_ID, NOW));
    expect(getDesktopItems(moved).map((item) => item.id)).toEqual([RECYCLE_BIN_ID, BLOG_FOLDER_ID]);
  });
});
