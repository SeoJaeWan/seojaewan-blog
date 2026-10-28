import { describe, expect, it } from 'vitest';

import {
  createExplorerContent,
  type ExplorerWindowContent,
} from '@/shared/utils/window-rules/window-rules';
import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  RECYCLE_BIN_ID,
  trashItems,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';
import { NOW, testCatalog } from '@/shared/utils/workspace-rules/workspace-rules.fixture';

import {
  canGoBack,
  canGoForward,
  closeTab,
  getCurrentLocation,
  getFocusableTreeKey,
  getNavigationRows,
  getParentLocation,
  goBack,
  goForward,
  goUp,
  isTreeNodeExpanded,
  moveTab,
  navigateTo,
  openNewTab,
  resolveExplorerContent,
  selectTab,
  setTreeNodeExpanded,
} from './explorer-navigation';

const REACT = 'folder:React';
const HOOKS = 'folder:React/Hooks';
const NEXT = 'folder:Next.js';

const workspace = createInitialWorkspace(testCatalog);

/**
 * 폴더를 휴지통에 보낸 작업 공간을 만든다.
 * @param ids 보낼 항목
 * @returns 작업 공간
 */
function trash(ids: readonly string[]): WorkspaceState {
  const result = trashItems(workspace, ids, NOW);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.state;
}

/**
 * 위치들을 차례로 지나간 창 내용을 만든다.
 * @param locations 지나갈 위치(첫 위치로 창을 연다)
 * @returns 창 내용
 */
function visit(...locations: (string | null)[]): ExplorerWindowContent {
  const [first = BLOG_FOLDER_ID, ...rest] = locations;
  return rest.reduce(
    (content, location) => navigateTo(content, workspace, location),
    createExplorerContent(first),
  );
}

/**
 * 탭 여러 개를 연 창 내용을 만든다. 탭은 모두 `Blog` 폴더이고 마지막 탭을 고른다.
 * @param count 탭 개수
 * @returns 창 내용
 */
function withTabs(count: number): ExplorerWindowContent {
  let content = createExplorerContent(BLOG_FOLDER_ID);
  for (let index = 1; index < count; index += 1) {
    content = openNewTab(content, workspace);
  }
  return content;
}

// @codocs [[파일 탐색기:조작]]
describe('파일 탐색기:조작', () => {
  it('폴더로 가면 같은 탭이 그 폴더를 본다', () => {
    const content = visit(BLOG_FOLDER_ID, REACT);
    expect(content.tabs).toHaveLength(1);
    expect(getCurrentLocation(content)).toBe(REACT);
  });

  it('지금 보는 위치로 다시 가면 기록을 늘리지 않는다', () => {
    const content = visit(BLOG_FOLDER_ID);
    expect(navigateTo(content, workspace, BLOG_FOLDER_ID)).toBe(content);
  });

  it('뒤로 갔다가 다른 폴더로 가면 앞으로 기록을 지운다', () => {
    const content = navigateTo(goBack(visit(BLOG_FOLDER_ID, REACT), workspace), workspace, NEXT);
    expect(canGoForward(content)).toBe(false);
  });
});

// @codocs [[파일 탐색기:탭]]
describe('파일 탐색기:탭', () => {
  it('뒤로 가면 바로 앞에 본 위치로 간다', () => {
    expect(getCurrentLocation(goBack(visit(BLOG_FOLDER_ID, REACT), workspace))).toBe(
      BLOG_FOLDER_ID,
    );
  });

  it('뒤로 간 뒤 앞으로 가면 돌아온 위치로 다시 간다', () => {
    const back = goBack(visit(BLOG_FOLDER_ID, REACT), workspace);
    expect(getCurrentLocation(goForward(back, workspace))).toBe(REACT);
  });

  it('처음 연 위치에서는 뒤로 갈 수 없다', () => {
    expect(canGoBack(visit(BLOG_FOLDER_ID))).toBe(false);
  });

  it('뒤로·앞으로 기록은 탭마다 따로 있다', () => {
    const content = openNewTab(visit(BLOG_FOLDER_ID, REACT), workspace);
    expect(canGoBack(content)).toBe(false);
    expect(canGoBack(selectTab(content, workspace, 0))).toBe(true);
  });

  it('위로는 상위 폴더로 간다', () => {
    expect(getCurrentLocation(goUp(visit(HOOKS), workspace))).toBe(REACT);
  });

  it('위로는 바탕화면 바로 아래 폴더에서 바탕화면으로 간다', () => {
    expect(getCurrentLocation(goUp(visit(BLOG_FOLDER_ID), workspace))).toBeNull();
  });

  it('바탕화면에는 상위 위치가 없어 위로가 비활성이다', () => {
    expect(getParentLocation(workspace, null)).toBeUndefined();
  });

  it('휴지통의 상위 위치는 바탕화면이다', () => {
    expect(getParentLocation(workspace, RECYCLE_BIN_ID)).toBeNull();
  });

  it('새 탭(+)은 바탕 화면 위치로 열고 그 탭을 고른다', () => {
    const content = openNewTab(visit(REACT), workspace);
    expect(content.tabs).toHaveLength(2);
    expect(content.activeTabIndex).toBe(1);
    expect(getCurrentLocation(content)).toBeNull();
  });

  it('새 탭에서 열기는 그 폴더를 보는 새 탭을 열고 고른다', () => {
    expect(getCurrentLocation(openNewTab(visit(BLOG_FOLDER_ID), workspace, REACT))).toBe(REACT);
  });

  it('새 탭은 창 안에서 겹치지 않는 id를 받는다', () => {
    const content = closeTab(withTabs(3), workspace, 1);
    const ids = openNewTab(content ?? withTabs(1), workspace).tabs.map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('탭을 클릭하면 그 탭으로 바꾼다', () => {
    expect(selectTab(withTabs(3), workspace, 0).activeTabIndex).toBe(0);
  });

  it('고른 탭을 닫으면 오른쪽 탭을 고른다', () => {
    const content = selectTab(withTabs(3), workspace, 1);
    const closed = closeTab(content, workspace, 1);
    expect(closed?.tabs.map((tab) => tab.id)).toEqual(['tab-1', 'tab-3']);
    expect(closed?.activeTabIndex).toBe(1);
  });

  it('맨 오른쪽의 고른 탭을 닫으면 왼쪽 탭을 고른다', () => {
    expect(closeTab(withTabs(3), workspace, 2)?.activeTabIndex).toBe(1);
  });

  it('고른 탭보다 왼쪽 탭을 닫으면 고른 탭을 그대로 둔다', () => {
    const closed = closeTab(withTabs(3), workspace, 0);
    expect(closed?.tabs[closed.activeTabIndex]?.id).toBe('tab-3');
  });

  it('고른 탭을 닫으면 새로 고른 탭의 위치와 조상을 탐색 창에서 펼친다', () => {
    const content = openNewTab(visit(REACT), workspace);
    const collapsed = setTreeNodeExpanded(content, BLOG_FOLDER_ID, false);
    const closed = closeTab(collapsed, workspace, 1);
    expect(closed && isTreeNodeExpanded(closed, workspace, BLOG_FOLDER_ID)).toBe(true);
  });

  it('탭을 끌어 다른 자리로 옮긴다', () => {
    const moved = moveTab(withTabs(3), 2, 0);
    expect(moved.tabs.map((tab) => tab.id)).toEqual(['tab-3', 'tab-1', 'tab-2']);
  });

  it('탭을 옮겨도 고른 탭은 그대로다', () => {
    const moved = moveTab(withTabs(3), 2, 0);
    expect(moved.tabs[moved.activeTabIndex]?.id).toBe('tab-3');
  });

  it('마지막 탭을 닫으면 창을 닫는다', () => {
    expect(closeTab(withTabs(1), workspace, 0)).toBeNull();
  });

  it('다른 창에서 지금 보는 폴더를 휴지통에 넣으면 상위 폴더로 이동한다', () => {
    const content = resolveExplorerContent(visit(BLOG_FOLDER_ID, REACT), trash([REACT]));
    expect(getCurrentLocation(content)).toBe(BLOG_FOLDER_ID);
  });

  it('보는 폴더의 상위 폴더를 휴지통에 넣으면 휴지통에 넣은 폴더의 상위 폴더로 이동한다', () => {
    const content = resolveExplorerContent(visit(HOOKS), trash([REACT]));
    expect(getCurrentLocation(content)).toBe(BLOG_FOLDER_ID);
  });

  it('상위 폴더로 옮기면서 바로 앞 기록과 같아지면 그 기록과 합친다', () => {
    const content = resolveExplorerContent(visit(BLOG_FOLDER_ID, REACT), trash([REACT]));
    expect(content.tabs[0]?.history).toEqual([BLOG_FOLDER_ID]);
  });

  it('고르지 않은 탭이 보는 폴더도 휴지통에 넣으면 상위 폴더로 이동한다', () => {
    const content = openNewTab(visit(REACT), workspace);
    const resolved = resolveExplorerContent(content, trash([REACT]));
    expect(resolved.tabs[0]?.history).toEqual([BLOG_FOLDER_ID]);
  });

  it('보는 폴더가 휴지통에 없으면 그대로 둔다', () => {
    const content = visit(NEXT);
    expect(resolveExplorerContent(content, trash([REACT]))).toBe(content);
  });

  it('뒤로 간 위치가 그새 휴지통에 들어갔으면 그 상위 폴더로 간다', () => {
    const content = visit(BLOG_FOLDER_ID, REACT, HOOKS, NEXT);
    expect(getCurrentLocation(goBack(content, trash([REACT])))).toBe(BLOG_FOLDER_ID);
  });
});

// @codocs [[파일 탐색기:구성]]
describe('파일 탐색기:구성', () => {
  it('탐색 창은 바탕화면 아래 폴더 트리와 휴지통이다', () => {
    const labels = getNavigationRows(visit(BLOG_FOLDER_ID), workspace).map((row) => row.label);
    expect(labels).toEqual(['바탕 화면', 'Blog', 'React', 'Next.js', '휴지통']);
  });

  it('탐색 창은 현재 위치와 그 조상을 펼치고 나머지는 접는다', () => {
    const rows = getNavigationRows(visit(HOOKS), workspace);
    expect(rows.map((row) => [row.label, row.expand])).toEqual([
      ['바탕 화면', 'expanded'],
      ['Blog', 'expanded'],
      ['React', 'expanded'],
      ['Hooks', 'none'],
      ['Next.js', 'none'],
      ['휴지통', 'none'],
    ]);
  });

  it('탐색 창은 현재 위치를 고른 칸으로 표시한다', () => {
    const rows = getNavigationRows(visit(REACT), workspace);
    expect(rows.filter((row) => row.selected).map((row) => row.label)).toEqual(['React']);
  });

  it('하위 폴더가 있는 접힌 폴더를 펼치면 하위 폴더가 보인다', () => {
    const content = setTreeNodeExpanded(visit(BLOG_FOLDER_ID), REACT, true);
    expect(getNavigationRows(content, workspace).map((row) => row.label)).toContain('Hooks');
  });

  it('현재 위치의 조상을 접으면 접힌 채로 둔다', () => {
    const content = setTreeNodeExpanded(visit(REACT), BLOG_FOLDER_ID, false);
    expect(isTreeNodeExpanded(content, workspace, BLOG_FOLDER_ID)).toBe(false);
  });

  it('접어 둔 폴더 안으로 가면 그 폴더를 다시 펼친다', () => {
    const collapsed = setTreeNodeExpanded(visit(NEXT), BLOG_FOLDER_ID, false);
    const content = navigateTo(collapsed, workspace, REACT);
    expect(isTreeNodeExpanded(content, workspace, BLOG_FOLDER_ID)).toBe(true);
  });

  it('휴지통 안의 폴더는 탐색 창에 보이지 않는다', () => {
    const labels = getNavigationRows(visit(BLOG_FOLDER_ID), trash([REACT])).map((row) => row.label);
    expect(labels).not.toContain('React');
  });

  it('탐색 창은 고른 칸이 보이면 그 칸만 Tab으로 닿는다', () => {
    const content = visit(REACT);
    expect(getFocusableTreeKey(getNavigationRows(content, workspace), content, workspace)).toBe(
      REACT,
    );
  });

  it('현재 위치의 조상을 접으면 가장 가까운 보이는 조상이 Tab으로 닿는다', () => {
    const content = setTreeNodeExpanded(visit(HOOKS), BLOG_FOLDER_ID, false);
    expect(getFocusableTreeKey(getNavigationRows(content, workspace), content, workspace)).toBe(
      BLOG_FOLDER_ID,
    );
  });

  it('보이는 조상이 없으면 첫 칸이 Tab으로 닿는다', () => {
    const content = visit(REACT);
    const rows = getNavigationRows(content, workspace).filter((row) => row.key !== REACT);
    expect(getFocusableTreeKey(rows.slice(-1), content, workspace)).toBe(RECYCLE_BIN_ID);
  });

  it('탐색 창의 하위 폴더는 정해 준 차례로 둔다', () => {
    const rows = getNavigationRows(visit(BLOG_FOLDER_ID), workspace, (_parent, nodes) =>
      [...nodes].reverse(),
    );
    expect(rows.map((row) => row.label)).toEqual([
      '바탕 화면',
      'Blog',
      'Next.js',
      'React',
      '휴지통',
    ]);
  });
});
