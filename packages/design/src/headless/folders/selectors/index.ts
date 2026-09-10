/**
 * @file Window·Workspace·Catalog·보기 설정에서 File Explorer 제품 read model을 파생한다.
 *
 * DOM, focus, raw input과 Store mutation은 소유하지 않는다.
 */
import type {
  ContentCatalogReader,
  ExternalShortcutCatalogReader,
  FolderResourceRef,
  ResourceId,
  ResourceKind,
  ResourceRef,
} from "../../resources/index.js";
import type { StartSnapshot } from "../../start/index.js";
import type {
  FileExplorerWindowSession,
  WindowMode,
  WindowSessionId,
  WindowState,
} from "../../windows/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import {
  getFolderNameComparisonKey,
  selectWorkspaceBreadcrumb,
  selectWorkspacePath,
  selectWorkspaceSidebarTree,
  type WorkspaceBreadcrumbItem,
  type WorkspaceSidebarTreeNode,
} from "../../workspace/index.js";
import type { FileExplorerTabId } from "../fileExplorerTabId/index.js";
import type {
  ExplorerNavigationTarget,
  FileExplorerLocation,
  FileExplorerNavigationValue,
  FileExplorerTab,
} from "../model/index.js";
import {
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettings,
  type FolderViewSettingsSnapshot,
} from "../viewSettings/index.js";

/** File Explorer selector가 Content와 ExternalShortcut 표시 원본을 읽는 port다. */
export type FileExplorerResourceReaders = Readonly<{
  /** Content title과 date를 조회하는 Application Catalog다. */
  content: ContentCatalogReader;
  /** ExternalShortcut name을 조회하는 Application Catalog다. */
  externalShortcut: ExternalShortcutCatalogReader;
}>;

/** Content viewport와 search result에 공통으로 쓰는 Resource 표시 항목이다. */
export type FileExplorerResourceItem = Readonly<{
  resource: ResourceRef;
  kind: ResourceKind;
  name: string;
  date: string | null;
}>;

/** 한 tab의 label, 주소 target과 활성 상태를 나타낸다. */
export type FileExplorerTabView = Readonly<{
  id: FileExplorerTabId;
  title: string;
  address: string;
  target: ExplorerNavigationTarget;
  active: boolean;
}>;

/** Sidebar Folder node에 expansion과 현재 위치 표시를 결합한 재귀 read model이다. */
export type FileExplorerSidebarItem = Readonly<{
  kind: "folder";
  ref: FolderResourceRef;
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  current: boolean;
  children: readonly FileExplorerSidebarItem[];
}>;

/** Sidebar에서 현재 정상 Explorer location과 같은 row identity다. */
export type FileExplorerSidebarCurrentRow =
  /** Desktop root가 현재 위치다. */
  | Readonly<{ kind: "desktop"; location: null }>
  /** 현재 위치와 같은 Folder row다. */
  | Readonly<{ kind: "folder"; location: FolderResourceRef }>;

/** desktop Sidebar의 root, 현재 row와 Window-local 폭이다. */
export type FileExplorerSidebarView = Readonly<{
  visible: true;
  width: number;
  desktop: Readonly<{ kind: "desktop"; name: "Desktop"; path: "/"; current: boolean }>;
  items: readonly FileExplorerSidebarItem[];
  currentRow: FileExplorerSidebarCurrentRow | null;
  visibleRows: readonly (FileExplorerSidebarView["desktop"] | FileExplorerSidebarItem)[];
  expandedFolderIds: readonly ResourceId[];
}>;

/** desktop status가 표시하는 현재 collection과 selection 개수다. */
export type FileExplorerStatusView = Readonly<{
  itemCount: number | null;
  selectionCount: number | null;
  searchResultCount: number | null;
}>;

/** unresolved address가 Content에 표시할 제품 오류다. */
export type FileExplorerErrorView = Readonly<{
  kind: "unresolved-path";
  path: string;
  message: string;
}>;

/** File Explorer Window가 한 번 소비하는 DOM-free 제품 snapshot이다. */
export type FileExplorerReadModel = Readonly<{
  sessionId: WindowSessionId;
  mode: WindowMode;
  title: string;
  activeTabId: FileExplorerTabId;
  tabs: readonly FileExplorerTabView[] | null;
  address: string;
  breadcrumb: readonly WorkspaceBreadcrumbItem[];
  error: FileExplorerErrorView | null;
  canGoBack: boolean;
  canGoForward: boolean;
  query: string;
  selection: readonly ResourceRef[];
  directChildren: readonly FileExplorerResourceItem[];
  items: readonly FileExplorerResourceItem[];
  empty: "folder" | "search" | null;
  sidebar: FileExplorerSidebarView | null;
  status: FileExplorerStatusView | null;
  viewSettings: FolderViewSettings | null;
}>;

/** composite selector가 받는 authoritative snapshot과 Catalog reader다. */
export type FileExplorerReadModelInput = Readonly<{
  windows: WindowState;
  workspace: WorkspaceState;
  start: StartSnapshot;
  viewSettings: FolderViewSettingsSnapshot;
  readers: FileExplorerResourceReaders;
  sessionId: WindowSessionId;
}>;

/** legacy direct location과 canonical target을 하나의 Explorer target으로 정규화한다. */
export const normalizeFileExplorerTarget = (
  value: FileExplorerNavigationValue,
): ExplorerNavigationTarget =>
  value === null || value.kind === "folder"
    ? Object.freeze({ kind: "location", location: value })
    : value;

/** 현재 Workspace casing을 사용해 target의 주소 문자열을 반환한다. */
export const selectFileExplorerAddress = (
  workspace: WorkspaceState,
  target: ExplorerNavigationTarget,
): string =>
  target.kind === "unresolved-path"
    ? target.path
    : (selectWorkspacePath(workspace, target.location) ?? "/");

/** 현재 Workspace 원본에서 target의 tab/title label을 반환한다. */
export const selectFileExplorerTitle = (
  workspace: WorkspaceState,
  target: ExplorerNavigationTarget,
): string => {
  if (target.kind === "unresolved-path") return target.path;
  if (target.location === null) return "Desktop";
  return workspace.folders.find(({ ref }) => ref.id === target.location?.id)?.name ?? "Desktop";
};

/** 동일 parent identity인지 Desktop null을 포함해 비교한다. */
const sameParent = (left: FolderResourceRef | null, right: FolderResourceRef | null): boolean =>
  left === null ? right === null : right !== null && left.id === right.id;

/** Resource kind의 안정적인 동률 정렬 순서를 반환한다. */
const kindRank = (kind: ResourceKind): number =>
  kind === "folder" ? 0 : kind === "content" ? 1 : 2;

/** 이름 normalization과 kind·ID tie-breaker로 항목을 결정적으로 정렬한다. */
const compareItemsByName = (
  left: FileExplorerResourceItem,
  right: FileExplorerResourceItem,
): number => {
  const leftName = getFolderNameComparisonKey(left.name);
  const rightName = getFolderNameComparisonKey(right.name);
  if (leftName !== rightName) return leftName < rightName ? -1 : 1;
  const rank = kindRank(left.kind) - kindRank(right.kind);
  return rank === 0 ? left.resource.id.localeCompare(right.resource.id) : rank;
};

/** Workspace placement 하나를 최신 종류별 원본의 표시 항목으로 해석한다. */
const selectPlacedItem = (
  workspace: WorkspaceState,
  resource: ResourceRef,
  readers: FileExplorerResourceReaders,
): FileExplorerResourceItem | null => {
  switch (resource.kind) {
    case "folder": {
      const folder = workspace.folders.find(({ ref }) => ref.id === resource.id);
      return folder === undefined
        ? null
        : Object.freeze({ resource: folder.ref, kind: "folder", name: folder.name, date: null });
    }
    case "content": {
      const content = readers.content.get(resource.id);
      return content === undefined
        ? null
        : Object.freeze({
            resource: content.ref,
            kind: "content",
            name: content.title,
            date: content.date,
          });
    }
    case "external-shortcut": {
      const shortcut = readers.externalShortcut.get(resource.id);
      return shortcut === undefined
        ? null
        : Object.freeze({
            resource: shortcut.ref,
            kind: "external-shortcut",
            name: shortcut.name,
            date: null,
          });
    }
  }
};

/** 현재 location의 세 Resource kind direct children을 최신 표시 이름으로 반환한다. */
export const selectFileExplorerDirectChildren = (
  workspace: WorkspaceState,
  location: FileExplorerLocation,
  readers: FileExplorerResourceReaders,
): readonly FileExplorerResourceItem[] =>
  Object.freeze(
    workspace.placements
      .filter(({ parent }) => sameParent(parent, location))
      .map(({ resource }) => selectPlacedItem(workspace, resource, readers))
      .filter((item): item is FileExplorerResourceItem => item !== null),
  );

/** location별 설정으로 direct children을 정렬하고 동일 key에서는 이름 순서를 유지한다. */
export const sortFileExplorerItems = (
  items: readonly FileExplorerResourceItem[],
  settings: FolderViewSettings,
): readonly FileExplorerResourceItem[] => {
  const direction = settings.sortDirection === "ascending" ? 1 : -1;
  return Object.freeze(
    [...items].sort((left, right) => {
      if (settings.sortKey === "date") {
        const compared = (left.date ?? "").localeCompare(right.date ?? "") * direction;
        if (compared !== 0) return compared;
      }
      return compareItemsByName(left, right) * direction;
    }),
  );
};

/** Folder 이름과 같은 NFC/case-insensitive normalization으로 contains 검색을 적용한다. */
export const searchFileExplorerItems = (
  items: readonly FileExplorerResourceItem[],
  query: string,
): readonly FileExplorerResourceItem[] => {
  const normalizedQuery = getFolderNameComparisonKey(query);
  if (normalizedQuery.length === 0) return items;
  return Object.freeze(
    items.filter(({ name }) => getFolderNameComparisonKey(name).includes(normalizedQuery)),
  );
};

/** 현재 surface와 location에 실제 적용할 view settings를 반환한다. */
export const selectEffectiveFolderViewSettings = (
  snapshot: FolderViewSettingsSnapshot,
  location: FileExplorerLocation,
): FolderViewSettings => {
  if (snapshot.surface === "mobile") return DEFAULT_FOLDER_VIEW_SETTINGS;
  return (
    snapshot.entries.find(({ location: candidate }) => sameParent(candidate, location))?.settings ??
    DEFAULT_FOLDER_VIEW_SETTINGS
  );
};

/** Workspace tree에 tab-local expansion과 현재 row를 재귀적으로 결합한다. */
const selectSidebarItems = (
  tree: readonly WorkspaceSidebarTreeNode[],
  expanded: ReadonlySet<ResourceId>,
  currentLocation: FileExplorerLocation | null,
  depth = 1,
): readonly FileExplorerSidebarItem[] =>
  Object.freeze(
    tree.map((node) => {
      const isExpanded = expanded.has(node.ref.id);
      return Object.freeze({
        kind: "folder" as const,
        ref: node.ref,
        name: node.name,
        path: node.path,
        depth,
        hasChildren: node.children.length > 0,
        expanded: isExpanded,
        current: currentLocation?.id === node.ref.id,
        children: selectSidebarItems(node.children, expanded, currentLocation, depth + 1),
      });
    }),
  );

/** expansion 상태를 따라 keyboard 이동 대상인 visible Sidebar row만 평탄화한다. */
const selectVisibleSidebarRows = (
  desktop: FileExplorerSidebarView["desktop"],
  items: readonly FileExplorerSidebarItem[],
): readonly (FileExplorerSidebarView["desktop"] | FileExplorerSidebarItem)[] => {
  const rows: Array<FileExplorerSidebarView["desktop"] | FileExplorerSidebarItem> = [desktop];
  /** 펼쳐진 row의 자식만 재귀적으로 visible sequence에 추가한다. */
  const append = (nodes: readonly FileExplorerSidebarItem[]): void => {
    for (const node of nodes) {
      rows.push(node);
      if (node.expanded) append(node.children);
    }
  };
  append(items);
  return Object.freeze(rows);
};

/** 현재 Folder의 ancestor identity를 breadcrumb에서 읽어 effective expansion에 추가한다. */
const revealCurrentAncestors = (
  workspace: WorkspaceState,
  location: FileExplorerLocation,
  expandedFolderIds: readonly ResourceId[],
): readonly ResourceId[] => {
  if (location === null) return expandedFolderIds;
  const ids = new Set(expandedFolderIds);
  const breadcrumb = selectWorkspaceBreadcrumb(workspace, location);
  for (const item of breadcrumb.slice(1, -1)) {
    if (item.location !== null) ids.add(item.location.id);
  }
  return Object.freeze([...ids]);
};

/** 위치별 저장 entry 없이도 mobile 고정값을 보장하도록 snapshot surface를 우선한다. */
const effectiveSettingsSnapshot = (
  mode: WindowMode,
  snapshot: FolderViewSettingsSnapshot,
): FolderViewSettingsSnapshot =>
  mode === "mobile" && snapshot.surface !== "mobile"
    ? Object.freeze({ surface: "mobile", entries: Object.freeze([]) })
    : snapshot;

/** 한 tab을 현재 Workspace의 title/address와 함께 표시용 tab으로 만든다. */
const selectTabView = (
  workspace: WorkspaceState,
  tab: FileExplorerTab,
  activeTabId: FileExplorerTabId,
): FileExplorerTabView => {
  const target = normalizeFileExplorerTarget(tab.navigation.current.location);
  return Object.freeze({
    id: tab.id,
    title: selectFileExplorerTitle(workspace, target),
    address: selectFileExplorerAddress(workspace, target),
    target,
    active: tab.id === activeTabId,
  });
};

/** 요청한 identity의 File Explorer Session만 반환한다. */
export const selectFileExplorerSession = (
  windows: WindowState,
  sessionId: WindowSessionId,
): FileExplorerWindowSession | null => {
  const session = windows.sessions.find(({ id }) => id === sessionId);
  return session?.kind === "file-explorer" ? session : null;
};

/** 기존 Store snapshot들을 File Explorer Window 하나의 제품 read model로 조합한다. */
export const selectFileExplorerReadModel = (
  input: FileExplorerReadModelInput,
): FileExplorerReadModel | null => {
  const session = selectFileExplorerSession(input.windows, input.sessionId);
  if (session === null) return null;
  const activeTab = session.tabs.find(({ id }) => id === session.activeTabId);
  if (activeTab === undefined) return null;
  const target = normalizeFileExplorerTarget(activeTab.navigation.current.location);
  const location = target.kind === "location" ? target.location : null;
  const resolved = target.kind === "location";
  const address = selectFileExplorerAddress(input.workspace, target);
  const title = selectFileExplorerTitle(input.workspace, target);
  const settings = selectEffectiveFolderViewSettings(
    effectiveSettingsSnapshot(input.windows.mode, input.viewSettings),
    location,
  );
  const directChildren = resolved
    ? sortFileExplorerItems(
        selectFileExplorerDirectChildren(input.workspace, location, input.readers),
        settings,
      )
    : Object.freeze([]);
  const query = resolved ? (activeTab.query ?? "") : "";
  const items = searchFileExplorerItems(directChildren, query);
  const selection = resolved ? Object.freeze([...(activeTab.selection ?? [])]) : Object.freeze([]);
  const expandedFolderIds = resolved
    ? revealCurrentAncestors(
        input.workspace,
        location,
        Object.freeze([...(activeTab.expandedFolderIds ?? [])]),
      )
    : Object.freeze([...(activeTab.expandedFolderIds ?? [])]);
  const sidebarLocation = resolved ? location : null;
  const isMobile = input.windows.mode === "mobile";
  let sidebar: FileExplorerSidebarView | null = null;
  if (!isMobile) {
    const desktop = Object.freeze({
      kind: "desktop" as const,
      name: "Desktop" as const,
      path: "/" as const,
      current: resolved && location === null,
    });
    const sidebarItems = selectSidebarItems(
      selectWorkspaceSidebarTree(input.workspace),
      new Set(expandedFolderIds),
      sidebarLocation,
    );
    sidebar = Object.freeze({
      visible: true as const,
      width: session.sidebarWidth ?? 240,
      desktop,
      items: sidebarItems,
      currentRow: !resolved
        ? null
        : location === null
          ? Object.freeze({ kind: "desktop" as const, location: null })
          : Object.freeze({ kind: "folder" as const, location }),
      visibleRows: selectVisibleSidebarRows(desktop, sidebarItems),
      expandedFolderIds,
    });
  }
  const status = isMobile
    ? null
    : Object.freeze({
        itemCount: resolved ? items.length : null,
        selectionCount: resolved ? selection.length : null,
        searchResultCount: resolved && query.length > 0 ? items.length : null,
      });

  return Object.freeze({
    sessionId: session.id,
    mode: input.windows.mode,
    title,
    activeTabId: activeTab.id,
    tabs: isMobile
      ? null
      : Object.freeze(session.tabs.map((tab) => selectTabView(input.workspace, tab, activeTab.id))),
    address,
    breadcrumb: resolved
      ? Object.freeze(selectWorkspaceBreadcrumb(input.workspace, location))
      : Object.freeze([]),
    error:
      target.kind === "unresolved-path"
        ? Object.freeze({
            kind: "unresolved-path" as const,
            path: target.path,
            message: `폴더를 찾을 수 없습니다: ${target.path}`,
          })
        : null,
    canGoBack: activeTab.navigation.backStack.length > 0,
    canGoForward: activeTab.navigation.forwardStack.length > 0,
    query,
    selection,
    directChildren,
    items,
    empty: items.length === 0 ? (query.length > 0 ? "search" : "folder") : null,
    sidebar,
    status,
    viewSettings: resolved || isMobile ? settings : null,
  });
};
