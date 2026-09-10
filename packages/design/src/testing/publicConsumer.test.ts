import { describe, expect, it } from "vitest";

import {
  createHeadlessRuntime,
  createResourceRef,
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type ExplorerNavigationTarget,
  type FileExplorerAction,
  type FileExplorerController,
  type FileExplorerControllerViewModel,
  type FileExplorerReadModel,
  type FolderViewSettingsStorage,
  FolderViewSettingsStore,
  HeadlessRuntimeProvider,
  type HeadlessRuntimeProviderProps,
  type OperationHandle,
  parseFolderViewSettingsLocation,
  type PrimaryPanelController,
  type PrimaryPanelControllerViewModel,
  resolveWorkspacePath,
  type StartController,
  type StartControllerViewModel,
  type TaskbarController,
  type TaskbarControllerViewModel,
  toExplorerNavigationTarget,
  useFileExplorerController,
  useHeadlessRuntime,
  usePrimaryPanelController,
  useStartController,
  useTaskbarController,
  useWindowController,
  useWorkspaceController,
  type WindowController,
  type WindowControllerViewModel,
  type WorkspaceController,
  type WorkspaceControllerViewModel,
  type WorkspaceState,
} from "../index.js";

type PublicController =
  | FileExplorerController
  | WindowController
  | WorkspaceController
  | StartController
  | TaskbarController
  | PrimaryPanelController;
type PublicViewModel =
  | FileExplorerControllerViewModel
  | WindowControllerViewModel
  | WorkspaceControllerViewModel
  | StartControllerViewModel
  | TaskbarControllerViewModel
  | PrimaryPanelControllerViewModel;
type PublicHandle = OperationHandle<
  { status: "committed" },
  { status: "presented" },
  { status: "settled" }
>;

describe("package public consumer", () => {
  it("root entry에서 runtime, Provider, controller hook과 공개 type을 함께 가져온다", () => {
    const runtime = createHeadlessRuntime();
    const runtimeProvider: typeof HeadlessRuntimeProvider = HeadlessRuntimeProvider;
    const runtimeHook: typeof useHeadlessRuntime = useHeadlessRuntime;
    const controllerHooks = [
      useWindowController,
      useFileExplorerController,
      useWorkspaceController,
      useStartController,
      useTaskbarController,
      usePrimaryPanelController,
    ] as const;
    const compileOnly = null as unknown as
      PublicController | PublicViewModel | PublicHandle | HeadlessRuntimeProviderProps;

    expect(runtimeProvider).toBeTypeOf("function");
    expect(runtimeHook).toBeTypeOf("function");
    expect(controllerHooks).toHaveLength(6);
    expect(runtime.primaryPanel).toBeDefined();
    expect(runtime.transitions).toBeDefined();
    expect(compileOnly).toBeNull();
  });

  it("File Explorer 제품 read model과 serializable Action을 package root에서 소비한다", () => {
    const action: FileExplorerAction = {
      type: "file-explorer.navigation.submit-address",
      path: "/Blog",
    };
    const compileOnly = null as FileExplorerReadModel | null;

    expect(action).toEqual({
      type: "file-explorer.navigation.submit-address",
      path: "/Blog",
    });
    expect(compileOnly).toBeNull();
  });

  it("Workspace path를 Explorer target으로 옮기고 Folder view location을 공유한다", () => {
    const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
    const workspace: WorkspaceState = {
      schemaVersion: 1,
      contentInbox: folder,
      folders: [{ ref: folder, name: "Blog" }],
      placements: [{ resource: folder, parent: null }],
    };
    const resolved = resolveWorkspacePath(workspace, "/blog/");
    const target: ExplorerNavigationTarget = toExplorerNavigationTarget(resolved);
    const storage: FolderViewSettingsStorage = {
      load: () => Promise.resolve(null),
      save: () => Promise.resolve(),
    };

    expect(target).toEqual({ kind: "location", location: folder });
    if (target.kind !== "location") throw new Error("정상 Folder target이 필요합니다");
    expect(target.location).toBe(folder);
    expect(parseFolderViewSettingsLocation(null)).toBeNull();
    expect(parseFolderViewSettingsLocation(folder)).toEqual(folder);
    expect(DEFAULT_FOLDER_VIEW_SETTINGS.viewMode).toBe("medium-icons");
    expect(FolderViewSettingsStore).toBeTypeOf("function");
    expect(storage.load).toBeTypeOf("function");
  });
});
