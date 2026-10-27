import { describe, expect, it } from 'vitest';

import {
  createInitialWorkspace,
  getPostItemId,
  pinToStart,
  trashItems,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';
import { NOW, testCatalog } from '@/shared/utils/workspace-rules/workspace-rules.fixture';

import {
  findPinnedIdAt,
  getAllStartItems,
  getPinnedStartItems,
  getStartItem,
  groupStartItems,
  START_TILE_ID_ATTRIBUTE,
} from './start-items';

const initial = createInitialWorkspace(testCatalog);

/**
 * 항목을 휴지통으로 보낸 상태를 만든다. 거부되면 테스트를 실패시킨다.
 * @param state 작업 공간 상태
 * @param ids 보낼 항목 id
 * @returns 바뀐 상태
 */
function trash(state: WorkspaceState, ids: readonly string[]): WorkspaceState {
  const result = trashItems(state, ids, NOW);
  if (!result.ok) {
    throw new Error(`거부됨: ${result.reason}`);
  }
  return result.state;
}

// @codocs [[Start 메뉴:고정됨]]
describe('Start 메뉴:고정됨', () => {
  it('처음에는 File Explorer, Chrome, Blog 폴더, 처음부터 고정한 외부 링크를 고정한 순서대로 보인다', () => {
    expect(getPinnedStartItems(initial).map((item) => item.title)).toEqual([
      'File Explorer',
      'Chrome',
      'Blog',
      'GitHub',
    ]);
  });

  it('고정 항목의 key는 이름이 아니라 항목 id다', () => {
    expect(getPinnedStartItems(initial).map((item) => item.id)).toEqual([
      'app:file-explorer',
      'app:chrome',
      'blog',
      'link:github',
    ]);
  });

  it('새로 고정한 항목은 맨 뒤에 보인다', () => {
    const state = pinToStart(initial, getPostItemId('react-19-hooks'));
    expect(getPinnedStartItems(state).at(-1)?.title).toBe('React 19 훅 정리');
  });

  it('휴지통에 들어간 항목은 고정됨에서 보이지 않는다', () => {
    const state = trash(initial, ['link:github']);
    expect(getPinnedStartItems(state).map((item) => item.title)).not.toContain('GitHub');
  });

  it('고정 칸 위의 자리에서 그 칸의 항목 id를 찾는다', () => {
    const grid = document.createElement('div');
    const tiles = ['a', 'b'].map((id, index) => {
      const tile = document.createElement('button');
      tile.setAttribute(START_TILE_ID_ATTRIBUTE, id);
      tile.getBoundingClientRect = () => new DOMRect(index * 100, 0, 100, 80);
      grid.append(tile);
      return tile;
    });
    expect(tiles).toHaveLength(2);
    expect(findPinnedIdAt(grid, 150, 40)).toBe('b');
    expect(findPinnedIdAt(grid, 150, 200)).toBeNull();
  });
});

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  it('앱, 폴더, 글, 외부 링크를 모두 나열한다', () => {
    const kinds = new Set(getAllStartItems(initial).map((item) => item.kind));
    expect(kinds).toEqual(new Set(['app', 'folder', 'post', 'link']));
  });

  it('휴지통과 휴지통에 들어간 항목은 뺀다', () => {
    const state = trash(initial, ['link:github', 'folder:React']);
    const titles = getAllStartItems(state).map((item) => item.title);
    expect(titles).not.toContain('휴지통');
    expect(titles).not.toContain('GitHub');
    expect(titles).not.toContain('React');
    expect(titles).not.toContain('React 19 훅 정리');
  });

  it('간단히와 그리드 보기는 첫 글자별로 묶는다', () => {
    const groups = groupStartItems(getAllStartItems(initial), 'list');
    expect(groups.map((group) => group.label)).toEqual([
      '#',
      'B',
      'C',
      'F',
      'G',
      'H',
      'N',
      'R',
      'U',
      'ㅅ',
    ]);
    expect(groupStartItems(getAllStartItems(initial), 'grid')).toEqual(groups);
  });

  it('범주 보기는 폴더, 글, 외부 링크, 앱 차례로 묶고 묶음 안은 이름순이다', () => {
    const groups = groupStartItems(getAllStartItems(initial), 'category');
    expect(groups.map((group) => group.label)).toEqual(['폴더', '글', '외부 링크', '앱']);
    expect(groups[3]?.items.map((item) => item.title)).toEqual(['Chrome', 'File Explorer']);
  });

  it('앱 id로 Start 항목을 찾는다', () => {
    expect(getStartItem(initial, 'app:chrome')?.title).toBe('Chrome');
  });

  it('없는 항목은 찾지 못한다', () => {
    expect(getStartItem(initial, 'post:없음')).toBeNull();
  });

  it('휴지통은 찾지 못한다', () => {
    expect(getStartItem(initial, 'recycle-bin')).toBeNull();
  });
});
