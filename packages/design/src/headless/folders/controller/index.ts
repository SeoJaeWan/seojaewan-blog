/**
 * @file File Explorer의 composite read model과 기존 Store Action 실행 경계를 React에 연결한다.
 *
 * authoritative state, raw input, IME, DOM focus와 body gesture는 소유하지 않는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import { useHeadlessRuntime } from "../../runtime/index.js";
import type { StartOperationHandle } from "../../start/index.js";
import type { WindowOperationHandle, WindowSessionId } from "../../windows/index.js";
import { resolveWorkspacePath, type WorkspaceOperationHandle } from "../../workspace/index.js";
import type { FileExplorerAction } from "../actions/index.js";
import {
  type FileExplorerSidebarContextMenu,
  selectFileExplorerSidebarContextMenu,
} from "../contextMenu/index.js";
import type { FileExplorerLocation } from "../model/index.js";
import {
  type FileExplorerReadModel,
  normalizeFileExplorerTarget,
  selectFileExplorerReadModel,
  selectFileExplorerSession,
} from "../selectors/index.js";
import type { FolderViewSettingsStoreResult } from "../viewSettings/index.js";

/** 필요한 Store 또는 요청한 File Explorer Session이 준비되지 않은 실행 결과다. */
export type FileExplorerUnavailableResult = Readonly<{
  status: "unavailable";
  reason: "not-ready" | "session-not-found" | "unresolved-location";
}>;

/** Context Menu 선택 뒤 Product Component가 소유할 inline input 초기 상태다. */
export type FileExplorerInlineEditRequest =
  /** 제안 이름 전체가 선택된 create input을 target parent 아래에 연다. */
  | Readonly<{
      status: "inline-edit-request";
      kind: "create";
      parent: FileExplorerLocation;
      initialName: string;
    }>
  /** 현재 이름 전체가 선택된 rename input을 target row에 연다. */
  | Readonly<{
      status: "inline-edit-request";
      kind: "rename";
      folder: Exclude<FileExplorerLocation, null>;
      initialName: string;
    }>;

/** File Explorer Action이 기존 owner 경계에서 반환하는 결과다. */
export type FileExplorerExecution =
  | WindowOperationHandle
  | WorkspaceOperationHandle
  | StartOperationHandle
  | Promise<FolderViewSettingsStoreResult>
  | FileExplorerInlineEditRequest
  | FileExplorerUnavailableResult;

/** SSR 준비 전, missing Session 또는 현재 File Explorer read model 상태다. */
export type FileExplorerControllerViewModel =
  /** 하나 이상의 authoritative Store가 아직 초기화되지 않았다. */
  | Readonly<{ status: "not-ready"; snapshot: null }>
  /** 요청한 identity가 없거나 File Explorer Session이 아니다. */
  | Readonly<{ status: "not-found"; snapshot: null }>
  /** 현재 Store snapshot에서 파생한 File Explorer 제품 read model이다. */
  | Readonly<{ status: "ready"; snapshot: FileExplorerReadModel }>;

/** File Explorer 제품 Component가 사용하는 단일 serializable Action 진입점이다. */
export type FileExplorerControllerActions = Readonly<{
  /** Action에 현재 Session·active tab을 결합해 기존 Window·Workspace·Start·view owner로 전달한다. */
  execute(action: FileExplorerAction): FileExplorerExecution;
}>;

/** File Explorer 제품 root가 read model, 실행 경계와 invocation menu projection을 소비한다. */
export type FileExplorerController = Readonly<{
  /** 여러 Store snapshot을 복제하지 않고 조합한 준비 상태다. */
  viewModel: FileExplorerControllerViewModel;
  /** 모든 제품 mutation intent를 받는 하나의 Action API다. */
  actions: FileExplorerControllerActions;
  /** 현재 snapshot에서 Sidebar invocation target의 headless menu data를 만든다. */
  getSidebarContextMenu(location: FileExplorerLocation): FileExplorerSidebarContextMenu | null;
}>;

/** 변경 불가능한 controller 실행 불가 결과를 만든다. */
const unavailable = (
  reason: FileExplorerUnavailableResult["reason"],
): FileExplorerUnavailableResult => Object.freeze({ status: "unavailable", reason });

/** Workspace path 결과를 canonical Explorer target으로 변환한다. */
const resolveAddress = (workspace: Parameters<typeof resolveWorkspacePath>[0], path: string) => {
  const resolution = resolveWorkspacePath(workspace, path);
  return resolution.type === "location"
    ? Object.freeze({ kind: "location" as const, location: resolution.location })
    : Object.freeze({ kind: "unresolved-path" as const, path: resolution.path });
};

/**
 * File Explorer Session 하나에 Window·Workspace·Start·view settings 구독을 결합한다.
 *
 * Application은 Store와 Catalog를 `HeadlessRuntimeProvider`에 미리 연결해야 하며, 이 hook은
 * Context state를 만들거나 Store lifecycle을 초기화하지 않는다.
 */
export const useFileExplorerController = (sessionId: WindowSessionId): FileExplorerController => {
  const runtime = useHeadlessRuntime();
  const windows = useSyncExternalStore(
    runtime.windows.subscribe,
    runtime.windows.getSnapshot,
    runtime.windows.getServerSnapshot,
  );
  const workspace = useSyncExternalStore(
    runtime.workspace.subscribe,
    runtime.workspace.getSnapshot,
    runtime.workspace.getServerSnapshot,
  );
  const start = useSyncExternalStore(
    runtime.start.subscribe,
    runtime.start.getSnapshot,
    runtime.start.getServerSnapshot,
  );
  const viewSettings = useSyncExternalStore(
    runtime.folderViewSettings.subscribe,
    runtime.folderViewSettings.getSnapshot,
    runtime.folderViewSettings.getServerSnapshot,
  );

  const viewModel = useMemo<FileExplorerControllerViewModel>(() => {
    if (
      windows.status !== "ready" ||
      workspace.status !== "ready" ||
      start.status !== "ready" ||
      viewSettings.status !== "ready"
    ) {
      return Object.freeze({ status: "not-ready", snapshot: null });
    }
    const snapshot = selectFileExplorerReadModel({
      windows: windows.snapshot,
      workspace: workspace.snapshot,
      start: start.snapshot,
      viewSettings: viewSettings.snapshot,
      readers: runtime.fileExplorerResources,
      sessionId,
    });
    return snapshot === null
      ? Object.freeze({ status: "not-found", snapshot: null })
      : Object.freeze({ status: "ready", snapshot });
  }, [runtime.fileExplorerResources, sessionId, start, viewSettings, windows, workspace]);

  const actions = useMemo<FileExplorerControllerActions>(
    () =>
      Object.freeze({
        /** 현재 snapshot의 target을 읽고 Action을 해당 authoritative Operation에 한 번 전달한다. */
        execute: (action: FileExplorerAction): FileExplorerExecution => {
          if (windows.status !== "ready" || workspace.status !== "ready") {
            return unavailable("not-ready");
          }
          const session = selectFileExplorerSession(windows.snapshot, sessionId);
          if (session === null) return unavailable("session-not-found");
          const tab = session.tabs.find(({ id }) => id === session.activeTabId);
          if (tab === undefined) return unavailable("session-not-found");

          switch (action.type) {
            case "file-explorer.tab.add":
              return runtime.windows.execute({ type: "add-file-explorer-tab", sessionId });
            case "file-explorer.tab.activate":
              return runtime.windows.execute({
                type: "activate-file-explorer-tab",
                sessionId,
                tabId: action.tabId,
              });
            case "file-explorer.tab.close":
              return runtime.windows.execute({
                type: "close-file-explorer-tab",
                sessionId,
                tabId: action.tabId,
              });
            case "file-explorer.navigation.navigate":
              return runtime.windows.execute({
                type: "navigate-file-explorer",
                sessionId,
                tabId: tab.id,
                target: { kind: "location", location: action.location },
              });
            case "file-explorer.navigation.submit-address":
              return runtime.windows.execute({
                type: "navigate-file-explorer",
                sessionId,
                tabId: tab.id,
                target: resolveAddress(workspace.snapshot, action.path),
              });
            case "file-explorer.navigation.back":
              return runtime.windows.execute({
                type: "go-back-file-explorer",
                sessionId,
                tabId: tab.id,
              });
            case "file-explorer.navigation.forward":
              return runtime.windows.execute({
                type: "go-forward-file-explorer",
                sessionId,
                tabId: tab.id,
              });
            case "file-explorer.navigation.refresh": {
              const target = normalizeFileExplorerTarget(tab.navigation.current.location);
              const resolution =
                target.kind === "unresolved-path"
                  ? resolveWorkspacePath(workspace.snapshot, target.path)
                  : null;
              return runtime.windows.execute({
                type: "refresh-file-explorer",
                sessionId,
                tabId: tab.id,
                ...(resolution?.type === "location"
                  ? { resolvedLocation: resolution.location }
                  : {}),
              });
            }
            case "file-explorer.query.set":
              return runtime.windows.execute({
                type: "set-file-explorer-query",
                sessionId,
                tabId: tab.id,
                query: action.query,
              });
            case "file-explorer.sidebar.expansion.set":
              return runtime.windows.execute({
                type: "set-file-explorer-expanded-folder-ids",
                sessionId,
                tabId: tab.id,
                expandedFolderIds: action.expandedFolderIds,
              });
            case "file-explorer.sidebar.width.set":
              return runtime.windows.execute({
                type: "set-file-explorer-sidebar-width",
                sessionId,
                sidebarWidth: action.width,
              });
            case "file-explorer.selection.set":
              return runtime.windows.execute({
                type: "set-file-explorer-selection",
                sessionId,
                tabId: tab.id,
                selection: action.selection,
              });
            case "file-explorer.view.update": {
              if (viewSettings.status !== "ready") return unavailable("not-ready");
              const target = normalizeFileExplorerTarget(tab.navigation.current.location);
              if (target.kind !== "location") return unavailable("unresolved-location");
              return runtime.folderViewSettings.execute({
                type: "folder-view-settings.update",
                location: target.location,
                change: action.change,
              });
            }
            case "file-explorer.folder.create.begin":
              return Object.freeze({
                status: "inline-edit-request" as const,
                kind: "create" as const,
                parent: action.parent,
                initialName: action.suggestedName,
              });
            case "file-explorer.folder.create":
              return runtime.workspace.execute({
                type: "create-folder",
                parent: action.parent,
                name: action.name,
              });
            case "file-explorer.folder.rename.begin":
              return Object.freeze({
                status: "inline-edit-request" as const,
                kind: "rename" as const,
                folder: action.folder,
                initialName: action.currentName,
              });
            case "file-explorer.folder.rename":
              return runtime.workspace.execute({
                type: "rename-folder",
                folder: action.folder,
                name: action.name,
              });
            case "file-explorer.window.open":
              return runtime.windows.execute({
                type: "create-file-explorer-window",
                location: action.location,
              });
            case "file-explorer.start.pin":
              return runtime.start.execute({ type: "pin", resource: action.resource });
            case "file-explorer.start.unpin":
              return runtime.start.execute({ type: "unpin", resource: action.resource });
          }
        },
      }),
    [runtime, sessionId, viewSettings.status, windows, workspace],
  );

  /** 현재 ready snapshot과 invocation location으로 menu target·entry를 만든다. */
  const getSidebarContextMenu = useMemo(
    () =>
      (location: FileExplorerLocation): FileExplorerSidebarContextMenu | null => {
        if (
          windows.status !== "ready" ||
          workspace.status !== "ready" ||
          start.status !== "ready" ||
          windows.snapshot.mode === "mobile"
        ) {
          return null;
        }
        const session = selectFileExplorerSession(windows.snapshot, sessionId);
        if (session === null) return null;
        return selectFileExplorerSidebarContextMenu(
          workspace.snapshot,
          start.snapshot,
          session.id,
          session.activeTabId,
          location,
        );
      },
    [sessionId, start, windows, workspace],
  );

  return useMemo(
    () => Object.freeze({ viewModel, actions, getSidebarContextMenu }),
    [actions, getSidebarContextMenu, viewModel],
  );
};
