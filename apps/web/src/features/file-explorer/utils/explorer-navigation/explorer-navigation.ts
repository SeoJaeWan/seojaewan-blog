// 탐색기 창 안의 이동(폴더 열기, 뒤로·앞으로·위로, 탭, 탐색 창 트리) 규칙을 React 밖의 순수 함수로 모은다.
// 창 내용은 창 저장소(`OpenWindow.content`)에 있고, 층 컴포넌트가 이 함수로 다음 내용을 만들어 저장소에 넣는다.

import type { ExplorerWorkspace } from '@/features/file-explorer/utils/explorer-location/explorer-location';
import type {
  ExplorerLocation,
  ExplorerTabState,
  ExplorerWindowContent,
} from '@/shared/utils/window-rules/window-rules';
import {
  BLOG_FOLDER_ID,
  DESKTOP_LOCATION_KEY,
  DESKTOP_NAME,
  type FolderTreeNode,
  getFolderPath,
  getFolderTree,
  isItemInTrash,
  RECYCLE_BIN_ID,
  RECYCLE_BIN_NAME,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 탐색 창 트리 칸 하나 */
export type NavigationRow = {
  /** 트리 칸 열쇠. 바탕화면은 `desktop`, 폴더는 폴더 id, 휴지통은 휴지통 id다 */
  key: string;
  /** 누르면 갈 위치 */
  location: ExplorerLocation;
  /** 이름 */
  label: string;
  /** 깊이(0~3). 3보다 깊은 폴더는 3으로 그린다(NavigationItem Level이 3까지다) */
  level: 0 | 1 | 2 | 3;
  /** 꺾쇠. 하위 폴더가 없으면 none이다 */
  expand: 'none' | 'collapsed' | 'expanded';
  /** 현재 위치인지 */
  selected: boolean;
  /** 아이콘 종류 */
  icon: 'desktop' | 'folder' | 'recycle-bin';
};

// NavigationItem Level의 가장 깊은 값이다.
const MAX_TREE_LEVEL = 3;

/**
 * 고른 탭. 차례가 어긋났으면 첫 탭이다.
 * @param content 탐색기 창 내용
 * @returns 고른 탭
 */
export function getActiveTab(content: ExplorerWindowContent): ExplorerTabState {
  const tab = content.tabs[content.activeTabIndex] ?? content.tabs[0];
  return tab ?? { id: 'tab-1', history: [BLOG_FOLDER_ID], historyIndex: 0 };
}

/**
 * 탭이 지금 보는 위치.
 * @param tab 탭
 * @returns 위치
 */
export function getTabLocation(tab: ExplorerTabState): ExplorerLocation {
  return tab.history[tab.historyIndex] ?? null;
}

/**
 * 창이 지금 보는 위치(고른 탭의 위치).
 * @param content 탐색기 창 내용
 * @returns 위치
 */
export function getCurrentLocation(content: ExplorerWindowContent): ExplorerLocation {
  return getTabLocation(getActiveTab(content));
}

/**
 * 고른 탭에서 위치로 간다(폴더 더블클릭, 위치 칸, 탐색 창, 위로). 앞으로 기록은 지우고 새 위치를 기록 끝에 더한다.
 * 지금 위치와 같으면 기록을 늘리지 않는다. 간 위치와 그 조상은 탐색 창에서 펼친다.
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param location 갈 위치
 * @returns 새 창 내용
 */
export function navigateTo(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  location: ExplorerLocation,
): ExplorerWindowContent {
  const target = resolveLocation(workspace, location);
  const tab = getActiveTab(content);
  if (getTabLocation(tab) === target) {
    return content;
  }
  const history = [...tab.history.slice(0, tab.historyIndex + 1), target];
  return revealLocation(
    replaceActiveTab(content, { ...tab, history, historyIndex: history.length - 1 }),
    workspace,
    target,
  );
}

/**
 * 고른 탭에 뒤로 갈 기록이 있는지.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @returns 있으면 true
 */
export function canGoBack(content: ExplorerWindowContent): boolean {
  return getActiveTab(content).historyIndex > 0;
}

/**
 * 고른 탭에 앞으로 갈 기록이 있는지.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @returns 있으면 true
 */
export function canGoForward(content: ExplorerWindowContent): boolean {
  const tab = getActiveTab(content);
  return tab.historyIndex < tab.history.length - 1;
}

/**
 * 고른 탭의 기록에서 한 칸 뒤로 간다. 기록 속 위치가 그새 휴지통에 들어갔으면 그 상위 폴더로 간다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @returns 새 창 내용. 뒤로 갈 기록이 없으면 그대로다
 */
export function goBack(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
): ExplorerWindowContent {
  return canGoBack(content) ? moveInHistory(content, workspace, -1) : content;
}

/**
 * 고른 탭의 기록에서 한 칸 앞으로 간다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @returns 새 창 내용. 앞으로 갈 기록이 없으면 그대로다
 */
export function goForward(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
): ExplorerWindowContent {
  return canGoForward(content) ? moveInHistory(content, workspace, 1) : content;
}

/**
 * 위치의 상위 위치. 폴더는 상위 폴더(바탕화면 바로 아래면 바탕화면), 휴지통은 바탕화면이다. 바탕화면은 상위가 없다.
 * @codocs [[파일 탐색기:탭]]
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 상위 위치. 바탕화면이면 undefined
 */
export function getParentLocation(
  workspace: ExplorerWorkspace,
  location: ExplorerLocation,
): ExplorerLocation | undefined {
  if (location === null) {
    return undefined;
  }
  if (location === RECYCLE_BIN_ID) {
    return null;
  }
  const parentId = workspace.items[location]?.parentId ?? null;
  return parentId === RECYCLE_BIN_ID ? null : parentId;
}

/**
 * 고른 탭에서 상위 위치로 간다(위로). 바탕화면에서는 그대로다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @returns 새 창 내용
 */
export function goUp(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
): ExplorerWindowContent {
  const parent = getParentLocation(workspace, getCurrentLocation(content));
  return parent === undefined ? content : navigateTo(content, workspace, parent);
}

/**
 * 탭을 고른다. 그 탭의 위치와 조상은 탐색 창에서 펼친다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param index 고를 탭의 차례
 * @returns 새 창 내용
 */
export function selectTab(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  index: number,
): ExplorerWindowContent {
  const tab = content.tabs[index];
  if (tab === undefined || index === content.activeTabIndex) {
    return content;
  }
  return revealLocation({ ...content, activeTabIndex: index }, workspace, getTabLocation(tab));
}

/**
 * 탭을 닫는다. 고른 탭을 닫으면 그 오른쪽 탭(없으면 왼쪽 탭)을 고르고, 그 탭의 위치와 조상을 탐색 창에서 펼친다.
 * 마지막 탭을 닫으면 창을 닫아야 한다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param index 닫을 탭의 차례
 * @returns 새 창 내용. 마지막 탭이었으면 null(창을 닫는다)
 */
export function closeTab(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  index: number,
): ExplorerWindowContent | null {
  if (content.tabs[index] === undefined) {
    return content;
  }
  if (content.tabs.length === 1) {
    return null;
  }
  const tabs = content.tabs.filter((_, tabIndex) => tabIndex !== index);
  let activeTabIndex = content.activeTabIndex;
  if (index < activeTabIndex) {
    activeTabIndex -= 1;
  } else if (index === activeTabIndex) {
    activeTabIndex = Math.min(index, tabs.length - 1);
  }
  const next = { ...content, tabs, activeTabIndex };
  return index === content.activeTabIndex
    ? revealLocation(next, workspace, getCurrentLocation(next))
    : next;
}

/**
 * 새 탭을 열어 맨 끝에 두고 고른다. 새 탭(+)은 `Blog` 폴더, 우클릭 메뉴의 새 탭에서 열기는 그 폴더다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param target 새 탭이 볼 위치. 주지 않으면 `Blog` 폴더다
 * @returns 새 창 내용
 */
export function openNewTab(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  target: ExplorerLocation = BLOG_FOLDER_ID,
): ExplorerWindowContent {
  const serial = content.lastTabSerial + 1;
  const location = resolveLocation(workspace, target);
  const tab: ExplorerTabState = {
    id: `tab-${String(serial)}`,
    history: [location],
    historyIndex: 0,
  };
  const tabs = [...content.tabs, tab];
  return revealLocation(
    { ...content, tabs, activeTabIndex: tabs.length - 1, lastTabSerial: serial },
    workspace,
    location,
  );
}

/**
 * 탐색기가 볼 수 있는 위치로 맞춘다. 휴지통에 들어간 폴더(휴지통에 보낸 폴더 안의 폴더 포함)는 휴지통에 보낸 폴더의
 * 원래 상위 폴더로, 없는 위치는 바탕화면으로 바꾼다.
 * @codocs [[파일 탐색기:탭]]
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 볼 수 있는 위치
 */
export function resolveLocation(
  workspace: ExplorerWorkspace,
  location: ExplorerLocation,
): ExplorerLocation {
  let current = location;
  const visited = new Set<string>();
  while (current !== null && current !== RECYCLE_BIN_ID && !visited.has(current)) {
    visited.add(current);
    const item = workspace.items[current];
    if (item?.kind !== 'folder') {
      return null;
    }
    if (!isItemInTrash(workspace, current)) {
      return current;
    }
    current = getTrashedRoot(workspace, current)?.trash?.originalParentId ?? null;
  }
  return current !== null && visited.has(current) ? null : current;
}

/**
 * 탭마다 지금 위치가 볼 수 있는 위치인지 보고, 아니면 그 위치를 바꾼다. 다른 창에서 지금 보는 폴더를 휴지통에 넣으면
 * 이 탭은 상위 폴더로 간다. 지금 기록 칸을 바꾸며, 바꾼 위치가 바로 앞이나 뒤 기록과 같으면 그 칸과 합친다.
 * @codocs [[파일 탐색기:탭]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @returns 새 창 내용. 바꿀 것이 없으면 그대로다
 */
export function resolveExplorerContent(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
): ExplorerWindowContent {
  const tabs = content.tabs.map((tab) => resolveTab(tab, workspace));
  return tabs.some((tab, index) => tab !== content.tabs[index]) ? { ...content, tabs } : content;
}

/**
 * 탐색 창 트리 칸이 펼쳐졌는지. 방문자가 펼치거나 접었으면 그대로, 아니면 바탕화면과 현재 위치, 그 조상만 펼친다.
 * @codocs [[파일 탐색기:구성]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param key 트리 칸 열쇠
 * @returns 펼쳤으면 true
 */
export function isTreeNodeExpanded(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  key: string,
): boolean {
  return (
    content.treeExpansion[key] ??
    getRevealKeys(workspace, getCurrentLocation(content)).includes(key)
  );
}

/**
 * 탐색 창 트리 칸을 펼치거나 접는다. 창 안에서만 기억한다.
 * @codocs [[파일 탐색기:구성]]
 * @param content 탐색기 창 내용
 * @param key 트리 칸 열쇠
 * @param isExpanded 펼칠지
 * @returns 새 창 내용
 */
export function setTreeNodeExpanded(
  content: ExplorerWindowContent,
  key: string,
  isExpanded: boolean,
): ExplorerWindowContent {
  return { ...content, treeExpansion: { ...content.treeExpansion, [key]: isExpanded } };
}

/** 한 위치의 하위 폴더 트리 칸을 늘어놓는 함수. 위치(폴더 id, 바탕화면은 null)와 하위 폴더를 받는다 */
export type OrderFolders = (
  parentId: string | null,
  nodes: readonly FolderTreeNode[],
) => readonly FolderTreeNode[];

/**
 * 탐색 창에 보일 트리 칸을 위에서부터 돌려준다. 바탕화면, 펼친 폴더의 하위 폴더, 휴지통 차례다.
 * 휴지통 안의 폴더는 보이지 않는다. 하위 폴더는 `orderFolders`가 정한 차례(그 위치의 정렬)로 둔다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param orderFolders 하위 폴더를 늘어놓는 함수. 주지 않으면 작업 공간 차례다
 * @returns 트리 칸
 */
export function getNavigationRows(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  orderFolders: OrderFolders = keepOrder,
): NavigationRow[] {
  const location = getCurrentLocation(content);
  const tree = orderFolders(null, getFolderTree(workspace));
  const rows: NavigationRow[] = [
    {
      key: DESKTOP_LOCATION_KEY,
      location: null,
      label: DESKTOP_NAME,
      level: 0,
      expand: getExpand(content, workspace, DESKTOP_LOCATION_KEY, tree.length > 0),
      selected: location === null,
      icon: 'desktop',
    },
  ];
  if (rows[0]?.expand === 'expanded') {
    appendFolderRows(rows, tree, 1, content, workspace, orderFolders);
  }
  rows.push({
    key: RECYCLE_BIN_ID,
    location: RECYCLE_BIN_ID,
    label: RECYCLE_BIN_NAME,
    level: 0,
    expand: 'none',
    selected: location === RECYCLE_BIN_ID,
    icon: 'recycle-bin',
  });
  return rows;
}

/**
 * 탐색 창에서 Tab으로 닿을 칸. 고른 칸(현재 위치)이 보이면 그 칸, 조상을 접어 보이지 않으면 가장 가까운 보이는 조상,
 * 그것도 없으면 첫 칸이다.
 * @codocs [[파일 탐색기:구성]]
 * @param rows 보이는 트리 칸
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @returns 트리 칸 열쇠
 */
export function getFocusableTreeKey(
  rows: readonly NavigationRow[],
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
): string | undefined {
  const selected = rows.find((row) => row.selected);
  if (selected !== undefined) {
    return selected.key;
  }
  const keys = new Set(rows.map((row) => row.key));
  const ancestor = getRevealKeys(workspace, getCurrentLocation(content))
    .toReversed()
    .find((key) => keys.has(key));
  return ancestor ?? rows[0]?.key;
}

/**
 * 폴더 트리 칸을 깊이 우선으로 더한다. 펼친 폴더만 하위 폴더를 더한다.
 * @param rows 더할 목록
 * @param nodes 폴더 트리
 * @param depth 깊이
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param orderFolders 하위 폴더를 늘어놓는 함수
 */
function appendFolderRows(
  rows: NavigationRow[],
  nodes: readonly FolderTreeNode[],
  depth: number,
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  orderFolders: OrderFolders,
): void {
  const location = getCurrentLocation(content);
  for (const node of nodes) {
    const expand = getExpand(content, workspace, node.folder.id, node.children.length > 0);
    rows.push({
      key: node.folder.id,
      location: node.folder.id,
      label: node.folder.name,
      level: toTreeLevel(depth),
      expand,
      selected: location === node.folder.id,
      icon: 'folder',
    });
    if (expand === 'expanded') {
      appendFolderRows(
        rows,
        orderFolders(node.folder.id, node.children),
        depth + 1,
        content,
        workspace,
        orderFolders,
      );
    }
  }
}

/**
 * 트리 칸의 꺾쇠 모양.
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param key 트리 칸 열쇠
 * @param hasChildren 하위 폴더가 있는지
 * @returns 꺾쇠
 */
function getExpand(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  key: string,
  hasChildren: boolean,
): NavigationRow['expand'] {
  if (!hasChildren) {
    return 'none';
  }
  return isTreeNodeExpanded(content, workspace, key) ? 'expanded' : 'collapsed';
}

/**
 * 깊이를 NavigationItem Level(0~3)로 바꾼다.
 * @param depth 깊이
 * @returns Level
 */
function toTreeLevel(depth: number): NavigationRow['level'] {
  const level = Math.min(depth, MAX_TREE_LEVEL);
  return level === 0 || level === 1 || level === 2 ? level : 3;
}

/**
 * 위치를 보이려고 펼칠 트리 칸 열쇠. 바탕화면과 위치까지의 폴더다. 휴지통은 바탕화면만이다.
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 트리 칸 열쇠
 */
function getRevealKeys(workspace: ExplorerWorkspace, location: ExplorerLocation): string[] {
  if (location === null || location === RECYCLE_BIN_ID) {
    return [DESKTOP_LOCATION_KEY];
  }
  return [DESKTOP_LOCATION_KEY, ...getFolderPath(workspace, location).map((folder) => folder.id)];
}

/**
 * 위치와 그 조상을 탐색 창에서 펼친다. 방문자가 접어 둔 기억을 지운다.
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 새 창 내용
 */
function revealLocation(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  location: ExplorerLocation,
): ExplorerWindowContent {
  const keys = new Set(getRevealKeys(workspace, location));
  const entries = Object.entries(content.treeExpansion);
  const kept = entries.filter(([key]) => !keys.has(key));
  return kept.length === entries.length
    ? content
    : { ...content, treeExpansion: Object.fromEntries(kept) };
}

/**
 * 고른 탭을 바꾼다.
 * @param content 탐색기 창 내용
 * @param tab 바꾼 탭
 * @returns 새 창 내용
 */
function replaceActiveTab(
  content: ExplorerWindowContent,
  tab: ExplorerTabState,
): ExplorerWindowContent {
  const index = content.tabs[content.activeTabIndex] === undefined ? 0 : content.activeTabIndex;
  return { ...content, tabs: content.tabs.map((entry, i) => (i === index ? tab : entry)) };
}

/**
 * 고른 탭의 기록에서 몇 칸 움직인다. 간 위치가 볼 수 없는 위치면 바로잡는다.
 * @param content 탐색기 창 내용
 * @param workspace 작업 공간
 * @param step 움직일 칸(-1 뒤로, 1 앞으로)
 * @returns 새 창 내용
 */
function moveInHistory(
  content: ExplorerWindowContent,
  workspace: ExplorerWorkspace,
  step: number,
): ExplorerWindowContent {
  const tab = getActiveTab(content);
  const moved = resolveTab({ ...tab, historyIndex: tab.historyIndex + step }, workspace);
  return revealLocation(replaceActiveTab(content, moved), workspace, getTabLocation(moved));
}

/**
 * 탭의 지금 위치를 볼 수 있는 위치로 바로잡는다.
 * @param tab 탭
 * @param workspace 작업 공간
 * @returns 바로잡은 탭. 바꿀 것이 없으면 그대로다
 */
function resolveTab(tab: ExplorerTabState, workspace: ExplorerWorkspace): ExplorerTabState {
  const location = getTabLocation(tab);
  const resolved = resolveLocation(workspace, location);
  if (resolved === location) {
    return tab;
  }
  const history = [...tab.history];
  let index = tab.historyIndex;
  history[index] = resolved;
  if (history[index + 1] === resolved) {
    history.splice(index + 1, 1);
  }
  if (index > 0 && history[index - 1] === resolved) {
    history.splice(index, 1);
    index -= 1;
  }
  return { ...tab, history, historyIndex: index };
}

/**
 * 휴지통 안의 폴더에서 휴지통에 바로 들어 있는 폴더(휴지통에 보낸 폴더)를 찾는다.
 * @param workspace 작업 공간
 * @param id 휴지통 안의 폴더 id
 * @returns 휴지통에 보낸 폴더
 */
function getTrashedRoot(
  workspace: ExplorerWorkspace,
  id: string,
): ExplorerWorkspace['items'][string] | undefined {
  let current = workspace.items[id];
  const visited = new Set<string>();
  while (current !== undefined && current.parentId !== RECYCLE_BIN_ID && !visited.has(current.id)) {
    visited.add(current.id);
    current = current.parentId === null ? undefined : workspace.items[current.parentId];
  }
  return current;
}

/**
 * 하위 폴더를 작업 공간 차례 그대로 둔다.
 * @param _parentId 위치
 * @param nodes 하위 폴더
 * @returns 그대로의 하위 폴더
 */
function keepOrder(
  _parentId: string | null,
  nodes: readonly FolderTreeNode[],
): readonly FolderTreeNode[] {
  return nodes;
}
