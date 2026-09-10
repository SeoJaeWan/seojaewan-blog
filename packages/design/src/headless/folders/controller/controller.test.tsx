import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
} from "../../resources/index.js";
import {
  type ControllerViewModel,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  HeadlessRuntimeProvider,
} from "../../runtime/index.js";
import type { StartSnapshot } from "../../start/index.js";
import type { WindowState } from "../../windows/index.js";
import { parseWindowSessionId } from "../../windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import { parseFileExplorerTabId } from "../fileExplorerTabId/index.js";
import type { FileExplorerNavigationValue } from "../model/index.js";
import type { FolderViewSettingsSnapshot } from "../viewSettings/index.js";
import { type FileExplorerController, useFileExplorerController } from "./index.js";

const sessionId = parseWindowSessionId("10000000-0000-4000-8000-000000000001");
const tabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000001");
const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const contentRef = createResourceRef("content", "40000000-0000-4000-8000-000000000001");
const shortcutRef = createResourceRef("external-shortcut", "50000000-0000-4000-8000-000000000001");
const workspaceSnapshot: WorkspaceState = Object.freeze({
  schemaVersion: 1,
  contentInbox: folder,
  folders: Object.freeze([Object.freeze({ ref: folder, name: "Blog" })]),
  placements: Object.freeze([
    Object.freeze({ resource: folder, parent: null }),
    Object.freeze({ resource: contentRef, parent: folder }),
    Object.freeze({ resource: shortcutRef, parent: folder }),
  ]),
});
const startSnapshot: StartSnapshot = Object.freeze({ pinnedItems: Object.freeze([]) });
const settingsSnapshot: FolderViewSettingsSnapshot = Object.freeze({
  surface: "desktop",
  entries: Object.freeze([]),
});
const content: Content = Object.freeze({
  ref: contentRef,
  title: "Entry",
  slug: "entry",
  summary: "",
  date: "2026-09-10",
  tags: Object.freeze([]),
  cover: null,
  source: Object.freeze({ kind: "notion", pageId: "page-1" }),
});
const shortcut: ExternalShortcut = Object.freeze({
  ref: shortcutRef,
  name: "External",
  url: "https://example.com",
});

/** current Explorer target을 가진 WindowState fixture를 만든다. */
const createWindows = (
  target: FileExplorerNavigationValue,
  mode: WindowState["mode"] = "desktop",
): WindowState =>
  Object.freeze({
    mode,
    workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
    sessions: Object.freeze([
      Object.freeze({
        kind: "file-explorer" as const,
        applicationId: "file-explorer" as const,
        id: sessionId,
        frame: Object.freeze({
          normalBounds: Object.freeze({ x: 10, y: 10, width: 900, height: 600 }),
          placement: "normal" as const,
          minimized: false,
        }),
        tabs: Object.freeze([
          Object.freeze({
            id: tabId,
            navigation: Object.freeze({
              current: Object.freeze({ location: target, scrollTop: 0 }),
              backStack: Object.freeze([]),
              forwardStack: Object.freeze([]),
            }),
            query: "",
            expandedFolderIds: Object.freeze([]),
            selection: Object.freeze([]),
          }),
        ]),
        activeTabId: tabId,
        sidebarWidth: 240,
      }),
    ]),
    stackingOrder: Object.freeze([sessionId]),
    activeSessionId: sessionId,
  });

/** React controller가 구독할 ready channel과 실행 spy를 만든다. */
const createChannel = <Snapshot, Action>(snapshot: Snapshot) => {
  const listeners = new Set<() => void>();
  const ready: ControllerViewModel<Snapshot> = Object.freeze({ status: "ready", snapshot });
  const notReady: ControllerViewModel<Snapshot> = Object.freeze({
    status: "not-ready",
    snapshot: null,
  });
  const execute = vi.fn((_action: Action) => ({}) as never);
  const channel = Object.freeze({
    getSnapshot: vi.fn(() => ready),
    getServerSnapshot: vi.fn(() => notReady),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute,
  }) as unknown as HeadlessFeatureRuntime<Snapshot, Action, never>;
  return { channel, execute, listenerCount: () => listeners.size };
};

/** Store channel과 Catalog reader를 가진 최소 HeadlessRuntime fixture를 만든다. */
const createRuntime = (
  target: FileExplorerNavigationValue,
  mode: WindowState["mode"] = "desktop",
) => {
  const windows = createChannel(createWindows(target, mode));
  const workspace = createChannel(workspaceSnapshot);
  const start = createChannel(startSnapshot);
  const folderViewSettings = createChannel(settingsSnapshot);
  const runtime = Object.freeze({
    windows: windows.channel,
    workspace: workspace.channel,
    start: start.channel,
    folderViewSettings: folderViewSettings.channel,
    fileExplorerResources: Object.freeze({
      content: createStaticCatalog([content]),
      externalShortcut: createStaticCatalog([shortcut]),
    }),
  }) as unknown as HeadlessRuntime;
  return { runtime, windows, workspace, start, folderViewSettings };
};

afterEach(() => cleanup());

describe("useFileExplorerController", () => {
  it("정상 주소와 unresolved 주소 submit을 exact Window Action target으로 각각 한 번 전달한다", () => {
    const fixture = createRuntime(folder);
    let controller: FileExplorerController | undefined;

    /** controller public 결과를 assertion 경계에 노출한다. */
    const Probe = () => {
      controller = useFileExplorerController(sessionId);
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    act(() => {
      void controller?.actions.execute({
        type: "file-explorer.navigation.submit-address",
        path: "/blog/",
      });
      void controller?.actions.execute({
        type: "file-explorer.navigation.submit-address",
        path: "/missing",
      });
    });

    expect(fixture.windows.execute).toHaveBeenNthCalledWith(1, {
      type: "navigate-file-explorer",
      sessionId,
      tabId,
      target: { kind: "location", location: folder },
    });
    expect(fixture.windows.execute).toHaveBeenNthCalledWith(2, {
      type: "navigate-file-explorer",
      sessionId,
      tabId,
      target: { kind: "unresolved-path", path: "/missing" },
    });
    expect(fixture.windows.execute).toHaveBeenCalledTimes(2);
  });

  it("refresh·query·expansion·width intent에 현재 Session과 active tab을 붙인다", () => {
    const unresolved = Object.freeze({
      kind: "unresolved-path" as const,
      path: "/Blog",
    }) as FileExplorerNavigationValue;
    const fixture = createRuntime(unresolved);
    let controller: FileExplorerController | undefined;

    /** controller public Action을 호출할 수 있게 보관한다. */
    const Probe = () => {
      controller = useFileExplorerController(sessionId);
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    expect(controller?.viewModel).toMatchObject({
      status: "ready",
      snapshot: {
        address: "/Blog",
        breadcrumb: [],
        error: { kind: "unresolved-path", path: "/Blog" },
        items: [],
        status: { itemCount: null, selectionCount: null, searchResultCount: null },
        viewSettings: null,
      },
    });
    act(() => {
      void controller?.actions.execute({ type: "file-explorer.navigation.refresh" });
      void controller?.actions.execute({ type: "file-explorer.query.set", query: "entry" });
      void controller?.actions.execute({
        type: "file-explorer.sidebar.expansion.set",
        expandedFolderIds: [folder.id],
      });
      void controller?.actions.execute({
        type: "file-explorer.sidebar.width.set",
        width: 312,
      });
    });

    expect(fixture.windows.execute.mock.calls).toEqual([
      [
        {
          type: "refresh-file-explorer",
          sessionId,
          tabId,
          resolvedLocation: folder,
        },
      ],
      [{ type: "set-file-explorer-query", sessionId, tabId, query: "entry" }],
      [
        {
          type: "set-file-explorer-expanded-folder-ids",
          sessionId,
          tabId,
          expandedFolderIds: [folder.id],
        },
      ],
      [{ type: "set-file-explorer-sidebar-width", sessionId, sidebarWidth: 312 }],
    ]);
  });

  it("view·Workspace·Start intent를 기존 owner Action으로 정확히 한 번씩 전달한다", () => {
    const fixture = createRuntime(folder);
    let controller: FileExplorerController | undefined;

    /** controller public Action을 호출할 수 있게 보관한다. */
    const Probe = () => {
      controller = useFileExplorerController(sessionId);
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    act(() => {
      void controller?.actions.execute({
        type: "file-explorer.view.update",
        change: { viewMode: "details" },
      });
      void controller?.actions.execute({
        type: "file-explorer.folder.create",
        parent: folder,
        name: "새 폴더",
      });
      void controller?.actions.execute({ type: "file-explorer.start.pin", resource: folder });
    });

    expect(fixture.folderViewSettings.execute).toHaveBeenCalledExactlyOnceWith({
      type: "folder-view-settings.update",
      location: folder,
      change: { viewMode: "details" },
    });
    expect(fixture.workspace.execute).toHaveBeenCalledExactlyOnceWith({
      type: "create-folder",
      parent: folder,
      name: "새 폴더",
    });
    expect(fixture.start.execute).toHaveBeenCalledExactlyOnceWith({
      type: "pin",
      resource: folder,
    });
    expect(fixture.windows.execute).not.toHaveBeenCalled();
  });

  it("Workspace·Start·view 실행 결과를 감싸지 않아 committed storage failure 정보를 보존한다", () => {
    const fixture = createRuntime(folder);
    const workspaceHandle = Object.freeze({ owner: "workspace" });
    const startHandle = Object.freeze({ owner: "start" });
    const viewResult = Promise.resolve({
      ok: false as const,
      reason: "storage-write-failed" as const,
      committed: true as const,
      value: settingsSnapshot,
    });
    fixture.workspace.execute.mockReturnValueOnce(workspaceHandle as never);
    fixture.start.execute.mockReturnValueOnce(startHandle as never);
    fixture.folderViewSettings.execute.mockReturnValueOnce(viewResult as never);
    let controller: FileExplorerController | undefined;

    /** controller가 owner의 원본 실행 결과 identity를 반환하는지 관찰한다. */
    const Probe = () => {
      controller = useFileExplorerController(sessionId);
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    const workspaceResult = controller?.actions.execute({
      type: "file-explorer.folder.create",
      parent: folder,
      name: "새 폴더",
    });
    const startResult = controller?.actions.execute({
      type: "file-explorer.start.pin",
      resource: folder,
    });
    const settingsResult = controller?.actions.execute({
      type: "file-explorer.view.update",
      change: { viewMode: "details" },
    });

    expect(workspaceResult).toBe(workspaceHandle);
    expect(startResult).toBe(startHandle);
    expect(settingsResult).toBe(viewResult);
  });

  it("normal·mobile projection과 Sidebar invocation menu를 현재 Store에서 제공한다", () => {
    const fixture = createRuntime(folder);
    let controller: FileExplorerController | undefined;

    /** controller read model을 assertion 경계에 노출한다. */
    const Probe = () => {
      controller = useFileExplorerController(sessionId);
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    expect(controller?.viewModel).toMatchObject({
      status: "ready",
      snapshot: { title: "Blog", address: "/Blog", mode: "desktop" },
    });
    const folderMenu = controller?.getSidebarContextMenu(folder);
    expect(folderMenu?.target).toEqual({
      surface: "file-explorer",
      sessionId,
      tabId,
      location: folder,
      resource: folder,
    });
    const createRequest = folderMenu?.entries.find(({ id }) => id === "create-folder");
    if (createRequest === undefined) throw new Error("create Folder entry가 필요합니다");
    expect(controller?.actions.execute(createRequest.action)).toEqual({
      status: "inline-edit-request",
      kind: "create",
      parent: folder,
      initialName: "새 폴더",
    });
    expect(fixture.workspace.execute).not.toHaveBeenCalled();

    cleanup();
    const mobile = createRuntime(folder, "mobile");
    render(
      createElement(HeadlessRuntimeProvider, { runtime: mobile.runtime }, createElement(Probe)),
    );
    expect(controller?.viewModel).toMatchObject({
      status: "ready",
      snapshot: {
        tabs: null,
        sidebar: null,
        status: null,
        viewSettings: { viewMode: "medium-icons" },
      },
    });
    expect(controller?.getSidebarContextMenu(folder)).toBeNull();
  });

  it("SSR은 네 browser Store를 읽지 않고 준비 전 read model을 반환한다", () => {
    const fixture = createRuntime(folder);
    const statuses: string[] = [];

    /** server render에서 controller 준비 상태만 기록한다. */
    const Probe = () => {
      statuses.push(useFileExplorerController(sessionId).viewModel.status);
      return null;
    };

    renderToString(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );

    expect(statuses).toEqual(["not-ready"]);
    for (const channel of [
      fixture.windows,
      fixture.workspace,
      fixture.start,
      fixture.folderViewSettings,
    ]) {
      expect(channel.channel.getSnapshot).not.toHaveBeenCalled();
      expect(channel.channel.getServerSnapshot).toHaveBeenCalledOnce();
    }
  });

  it("StrictMode unmount에서 네 authoritative Store 구독을 모두 정확히 해제한다", () => {
    const fixture = createRuntime(folder);

    /** 구독 lifecycle만 시작하는 controller consumer다. */
    const Probe = () => {
      useFileExplorerController(sessionId);
      return null;
    };

    const mounted = render(
      createElement(
        StrictMode,
        null,
        createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
      ),
    );
    const channels = [
      fixture.windows,
      fixture.workspace,
      fixture.start,
      fixture.folderViewSettings,
    ];
    expect(channels.map(({ listenerCount }) => listenerCount())).toEqual([1, 1, 1, 1]);

    mounted.unmount();
    expect(channels.map(({ listenerCount }) => listenerCount())).toEqual([0, 0, 0, 0]);
  });
});
