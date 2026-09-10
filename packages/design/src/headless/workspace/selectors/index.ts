/**
 * @file Workspace snapshot에서 Folder 경로, breadcrumb, Sidebar tree와 이름 제안을 파생한다.
 */
import type { Folder, FolderResourceRef, ResourceId } from "../../resources/index.js";
import type { WorkspaceState } from "../model/index.js";
import {
  compareFolderNames,
  getFolderNameComparisonKey,
  normalizeFolderName,
} from "../namePolicy/index.js";

/** Desktop(null) 또는 Folder를 가리키는 Workspace 위치다. */
export type WorkspaceLocation = FolderResourceRef | null;

/** 절대 경로가 해석된 위치 또는 제출한 문자열을 보존한 미해결 결과다. */
export type WorkspacePathResolution =
  | Readonly<{ type: "location"; location: WorkspaceLocation }>
  | Readonly<{ type: "unresolved-path"; path: string }>;

/** Desktop부터 현재 Folder까지의 한 breadcrumb segment다. */
export type WorkspaceBreadcrumbItem = Readonly<{
  location: WorkspaceLocation;
  name: string;
  path: string;
}>;

/** Sidebar에 표시할 Folder-only nested tree node다. */
export type WorkspaceSidebarTreeNode = Readonly<{
  ref: FolderResourceRef;
  name: string;
  path: string;
  children: readonly WorkspaceSidebarTreeNode[];
}>;

type FolderIndex = Readonly<{
  folderById: ReadonlyMap<ResourceId, Folder>;
  parentById: ReadonlyMap<ResourceId, FolderResourceRef | null>;
}>;

/** Folder 원본과 Folder placement를 ID로 조회할 selector-local index로 만든다. */
const indexFolders = (state: WorkspaceState): FolderIndex => {
  const folderById = new Map(state.folders.map((folder) => [folder.ref.id, folder]));
  const parentById = new Map<ResourceId, FolderResourceRef | null>();
  for (const placement of state.placements) {
    if (placement.resource.kind === "folder" && folderById.has(placement.resource.id)) {
      parentById.set(placement.resource.id, placement.parent);
    }
  }
  return { folderById, parentById };
};

/** Folder 위치의 root-to-leaf chain을 만들고 손상된 참조나 cycle은 null로 반환한다. */
const selectFolderChain = (
  state: WorkspaceState,
  location: FolderResourceRef,
): readonly Folder[] | null => {
  const { folderById, parentById } = indexFolders(state);
  const reversed: Folder[] = [];
  const visited = new Set<ResourceId>();
  let cursor: FolderResourceRef | null = location;

  while (cursor !== null) {
    if (visited.has(cursor.id)) return null;
    visited.add(cursor.id);
    const folder = folderById.get(cursor.id);
    if (folder === undefined || !parentById.has(cursor.id)) return null;
    reversed.push(folder);
    cursor = parentById.get(cursor.id) ?? null;
  }

  return reversed.reverse();
};

/** Desktop 또는 Folder 위치의 현재 저장 casing을 사용한 절대 경로를 반환한다. */
export const selectWorkspacePath = (
  state: WorkspaceState,
  location: WorkspaceLocation,
): string | null => {
  if (location === null) return "/";
  const chain = selectFolderChain(state, location);
  return chain === null ? null : `/${chain.map(({ name }) => name).join("/")}`;
};

/**
 * `/` 기반 절대 경로를 Desktop 또는 Folder ref로 해석한다.
 *
 * 마지막 slash는 무시하고 각 segment는 Folder 이름과 같은 NFC/case-insensitive key로 비교한다.
 */
export const resolveWorkspacePath = (
  state: WorkspaceState,
  path: string,
): WorkspacePathResolution => {
  if (!path.startsWith("/")) return { type: "unresolved-path", path };
  const withoutTrailingSlash = path === "/" ? path : path.replace(/\/+$/u, "");
  if (withoutTrailingSlash === "/") return { type: "location", location: null };

  const segments = withoutTrailingSlash.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return { type: "unresolved-path", path };
  }

  const { folderById, parentById } = indexFolders(state);
  let parent: FolderResourceRef | null = null;
  for (const segment of segments) {
    const key = getFolderNameComparisonKey(segment);
    const folder = state.folders.find(
      (candidate) =>
        getFolderNameComparisonKey(candidate.name) === key &&
        parentById.has(candidate.ref.id) &&
        (parentById.get(candidate.ref.id)?.id ?? null) === (parent?.id ?? null),
    );
    if (folder === undefined || !folderById.has(folder.ref.id)) {
      return { type: "unresolved-path", path };
    }
    parent = folder.ref;
  }

  return { type: "location", location: parent };
};

/** Desktop부터 현재 위치까지 저장 casing과 누적 경로를 가진 breadcrumb를 만든다. */
export const selectWorkspaceBreadcrumb = (
  state: WorkspaceState,
  location: WorkspaceLocation,
): readonly WorkspaceBreadcrumbItem[] => {
  const desktop: WorkspaceBreadcrumbItem = { location: null, name: "Desktop", path: "/" };
  if (location === null) return [desktop];
  const chain = selectFolderChain(state, location);
  if (chain === null) return [];

  let path = "";
  return [
    desktop,
    ...chain.map((folder) => {
      path += `/${folder.name}`;
      return { location: folder.ref, name: folder.name, path };
    }),
  ];
};

/** Desktop 아래의 Folder만 parent 계층과 case-insensitive sibling 순서로 반환한다. */
export const selectWorkspaceSidebarTree = (
  state: WorkspaceState,
): readonly WorkspaceSidebarTreeNode[] => {
  const { folderById, parentById } = indexFolders(state);
  const childrenByParent = new Map<ResourceId | null, Folder[]>();
  for (const folder of state.folders) {
    if (!parentById.has(folder.ref.id)) continue;
    const parent = parentById.get(folder.ref.id) ?? null;
    if (parent !== null && !folderById.has(parent.id)) continue;
    const key = parent?.id ?? null;
    childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), folder]);
  }
  for (const children of childrenByParent.values()) {
    children.sort((left, right) => compareFolderNames(left.name, right.name));
  }

  const build = (
    parent: FolderResourceRef | null,
    parentPath: string,
    ancestors: ReadonlySet<ResourceId>,
  ): readonly WorkspaceSidebarTreeNode[] =>
    (childrenByParent.get(parent?.id ?? null) ?? []).flatMap((folder) => {
      if (ancestors.has(folder.ref.id)) return [];
      const path = parentPath === "/" ? `/${folder.name}` : `${parentPath}/${folder.name}`;
      const nextAncestors = new Set(ancestors).add(folder.ref.id);
      return [
        {
          ref: folder.ref,
          name: folder.name,
          path,
          children: build(folder.ref, path, nextAncestors),
        },
      ];
    });

  return build(null, "/", new Set());
};

/** 같은 parent에서 사용할 수 있는 가장 작은 `새 폴더` suffix 이름을 제안한다. */
export const suggestWorkspaceFolderName = (
  state: WorkspaceState,
  parent: FolderResourceRef | null,
): string => {
  const { parentById } = indexFolders(state);
  const used = new Set(
    state.folders
      .filter(
        (folder) =>
          parentById.has(folder.ref.id) &&
          (parentById.get(folder.ref.id)?.id ?? null) === (parent?.id ?? null),
      )
      .map(({ name }) => getFolderNameComparisonKey(name)),
  );
  const base = normalizeFolderName("새 폴더");
  if (!used.has(getFolderNameComparisonKey(base))) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base} (${suffix})`;
    if (!used.has(getFolderNameComparisonKey(candidate))) return candidate;
  }
};
