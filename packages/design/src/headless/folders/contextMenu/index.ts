/**
 * @file File Explorer Sidebar invocation target, capability와 serializable menu entry를 만든다.
 *
 * portal, focus, anchor와 inline input lifecycle은 Product Component가 소유한다.
 */
import type { FolderResourceRef, ResourceRef } from "../../resources/index.js";
import type { StartSnapshot } from "../../start/index.js";
import type { WindowSessionId } from "../../windows/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import { suggestWorkspaceFolderName } from "../../workspace/index.js";
import type { FileExplorerAction } from "../actions/index.js";
import type { FileExplorerTabId } from "../fileExplorerTabId/index.js";
import type { FileExplorerLocation } from "../model/index.js";

/** Sidebar 우클릭 시 현재 navigation과 별도로 보존하는 invocation target이다. */
export type FileExplorerSidebarContextTarget = Readonly<{
  surface: "file-explorer";
  sessionId: WindowSessionId;
  tabId: FileExplorerTabId;
  location: FileExplorerLocation;
  resource?: FolderResourceRef;
}>;

/** Desktop와 Folder target에 따라 노출할 수 있는 제품 capability다. */
export type FileExplorerSidebarContextCapability = Readonly<{
  open: boolean;
  openInNewWindow: true;
  createFolder: true;
  rename: boolean;
  pinToStart: boolean;
}>;

/** Sidebar Product Context Menu가 Base UI item에 연결할 action entry다. */
export type FileExplorerSidebarContextEntry = Readonly<{
  kind: "action";
  id: string;
  label: string;
  action: FileExplorerAction;
}>;

/** invocation identity와 실행 가능한 section data를 묶은 headless menu model이다. */
export type FileExplorerSidebarContextMenu = Readonly<{
  target: FileExplorerSidebarContextTarget;
  capability: FileExplorerSidebarContextCapability;
  entries: readonly FileExplorerSidebarContextEntry[];
}>;

/** 두 ResourceRef의 kind와 ID가 같은지 비교한다. */
const sameResource = (left: ResourceRef, right: ResourceRef): boolean =>
  left.kind === right.kind && left.id === right.id;

/** target Folder가 현재 Start snapshot에 고정됐는지 판정한다. */
const isPinnedToStart = (start: StartSnapshot, folder: FolderResourceRef): boolean =>
  start.pinnedItems.some(({ resource }) => sameResource(resource, folder));

/** Desktop 또는 Folder row의 exact target과 Context Menu section을 만든다. */
export const selectFileExplorerSidebarContextMenu = (
  workspace: WorkspaceState,
  start: StartSnapshot,
  sessionId: WindowSessionId,
  tabId: FileExplorerTabId,
  location: FileExplorerLocation,
): FileExplorerSidebarContextMenu => {
  const target = Object.freeze({
    surface: "file-explorer" as const,
    sessionId,
    tabId,
    location,
    ...(location === null ? {} : { resource: location }),
  });
  const create: FileExplorerSidebarContextEntry = Object.freeze({
    kind: "action",
    id: "create-folder",
    label: "새 폴더",
    action: Object.freeze({
      type: "file-explorer.folder.create.begin",
      parent: location,
      suggestedName: suggestWorkspaceFolderName(workspace, location),
    }),
  });
  const openInNewWindow: FileExplorerSidebarContextEntry = Object.freeze({
    kind: "action",
    id: "open-in-new-window",
    label: "새 창에서 열기",
    action: Object.freeze({ type: "file-explorer.window.open", location }),
  });

  if (location === null) {
    return Object.freeze({
      target,
      capability: Object.freeze({
        open: false,
        openInNewWindow: true,
        createFolder: true,
        rename: false,
        pinToStart: false,
      }),
      entries: Object.freeze([create, openInNewWindow]),
    });
  }

  const folder = workspace.folders.find(({ ref }) => ref.id === location.id);
  const pinned = isPinnedToStart(start, location);
  return Object.freeze({
    target,
    capability: Object.freeze({
      open: true,
      openInNewWindow: true,
      createFolder: true,
      rename: true,
      pinToStart: true,
    }),
    entries: Object.freeze([
      Object.freeze({
        kind: "action" as const,
        id: "open",
        label: "열기",
        action: Object.freeze({
          type: "file-explorer.navigation.navigate" as const,
          location,
        }),
      }),
      openInNewWindow,
      create,
      Object.freeze({
        kind: "action" as const,
        id: "rename-folder",
        label: "이름 바꾸기",
        action: Object.freeze({
          type: "file-explorer.folder.rename.begin" as const,
          folder: location,
          currentName: folder?.name ?? "",
        }),
      }),
      Object.freeze({
        kind: "action" as const,
        id: pinned ? "unpin-from-start" : "pin-to-start",
        label: pinned ? "시작 화면에서 제거" : "시작 화면에 고정",
        action: Object.freeze({
          type: pinned ? "file-explorer.start.unpin" : "file-explorer.start.pin",
          resource: location,
        } as const),
      }),
    ]),
  });
};
