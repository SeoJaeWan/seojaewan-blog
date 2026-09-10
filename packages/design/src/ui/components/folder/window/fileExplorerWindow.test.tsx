import { createElement } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseFileExplorerTabId } from "../../../../headless/folders/index.js";
import type { FolderViewSettingsSnapshot } from "../../../../headless/folders/viewSettings/index.js";
import {
  type Content,
  createResourceRef,
  createStaticCatalog,
} from "../../../../headless/resources/index.js";
import {
  type ControllerViewModel,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  HeadlessRuntimeProvider,
} from "../../../../headless/runtime/index.js";
import type { StartSnapshot } from "../../../../headless/start/index.js";
import type { WindowAction, WindowState } from "../../../../headless/windows/index.js";
import { parseWindowSessionId } from "../../../../headless/windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../../../headless/workspace/index.js";
import { FileExplorerWindow } from "./index.js";

const sessionId = parseWindowSessionId("10000000-0000-4000-8000-000000000001");
const firstTabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000001");
const secondTabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000002");
const blog = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const archive = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const contentRef = createResourceRef("content", "40000000-0000-4000-8000-000000000001");

const workspace: WorkspaceState = Object.freeze({
  schemaVersion: 1,
  contentInbox: blog,
  folders: Object.freeze([
    Object.freeze({ ref: blog, name: "Blog" }),
    Object.freeze({ ref: archive, name: "Archive" }),
  ]),
  placements: Object.freeze([
    Object.freeze({ resource: blog, parent: null }),
    Object.freeze({ resource: archive, parent: null }),
    Object.freeze({ resource: contentRef, parent: blog }),
  ]),
});

const content: Content = Object.freeze({
  ref: contentRef,
  title: "Controller composition",
  slug: "controller-composition",
  summary: "",
  date: "2026-09-10",
  tags: Object.freeze([]),
  cover: null,
  source: Object.freeze({ kind: "notion", pageId: "page-1" }),
});

const createWindows = (mode: WindowState["mode"]): WindowState =>
  Object.freeze({
    mode,
    workArea: Object.freeze({ x: 0, y: 0, width: 1000, height: 700 }),
    sessions: Object.freeze([
      Object.freeze({
        kind: "file-explorer" as const,
        applicationId: "file-explorer" as const,
        id: sessionId,
        frame: Object.freeze({
          normalBounds: Object.freeze({ x: 40, y: 30, width: 820, height: 560 }),
          placement: "normal" as const,
          minimized: false,
        }),
        tabs: Object.freeze([
          Object.freeze({
            id: firstTabId,
            navigation: Object.freeze({
              current: Object.freeze({ location: blog, scrollTop: 0 }),
              backStack: Object.freeze([]),
              forwardStack: Object.freeze([]),
            }),
            query: "",
            expandedFolderIds: Object.freeze([]),
            selection: Object.freeze([contentRef]),
          }),
          Object.freeze({
            id: secondTabId,
            navigation: Object.freeze({
              current: Object.freeze({ location: archive, scrollTop: 0 }),
              backStack: Object.freeze([]),
              forwardStack: Object.freeze([]),
            }),
            query: "",
            expandedFolderIds: Object.freeze([]),
            selection: Object.freeze([]),
          }),
        ]),
        activeTabId: firstTabId,
        sidebarWidth: 240,
      }),
    ]),
    stackingOrder: Object.freeze([sessionId]),
    activeSessionId: sessionId,
  });

const channel = <Snapshot, Action>(snapshot: Snapshot) => {
  const execute = vi.fn((_action: Action) => ({}) as never);
  const ready: ControllerViewModel<Snapshot> = Object.freeze({ status: "ready", snapshot });
  return {
    execute,
    value: Object.freeze({
      execute,
      getSnapshot: () => ready,
      getServerSnapshot: () => ready,
      subscribe: () => () => undefined,
    }) as unknown as HeadlessFeatureRuntime<Snapshot, Action, never>,
  };
};

const createRuntime = (mode: WindowState["mode"] = "desktop") => {
  const windows = channel<WindowState, WindowAction>(createWindows(mode));
  const workspaceChannel = channel<WorkspaceState, never>(workspace);
  const start = channel<StartSnapshot, never>(Object.freeze({ pinnedItems: Object.freeze([]) }));
  const view = channel<FolderViewSettingsSnapshot, never>(
    Object.freeze({ surface: mode, entries: Object.freeze([]) }),
  );
  const runtime = Object.freeze({
    windows: windows.value,
    workspace: workspaceChannel.value,
    start: start.value,
    folderViewSettings: view.value,
    fileExplorerResources: Object.freeze({
      content: createStaticCatalog([content]),
      externalShortcut: createStaticCatalog([]),
    }),
    windowGestures: Object.freeze({ begin: vi.fn() }),
  }) as unknown as HeadlessRuntime;
  return { runtime, windows, workspace: workspaceChannel, view };
};

const renderWindow = (runtime: HeadlessRuntime) =>
  render(
    createElement(
      HeadlessRuntimeProvider,
      { runtime },
      createElement(FileExplorerWindow, {
        placementConfig: {
          defaultSize: { width: 800, height: 560 },
          minSize: { width: 320, height: 240 },
          edgeMargin: 8,
          cascadeOffset: { x: 24, y: 24 },
          titlebarRecoverySize: { width: 120, height: 30 },
        },
        sessionId,
      }),
    ),
  );

afterEach(() => cleanup());

describe("FileExplorerWindow", () => {
  it("controller 하나의 snapshot으로 WindowRoot title/body와 제품 part를 조합한다", () => {
    const fixture = createRuntime();
    renderWindow(fixture.runtime);

    expect(
      screen.getByRole("region", { name: "파일 탐색기 창" }).getAttribute("data-variant"),
    ).toBe("file-explorer");
    expect(screen.getByRole("tablist", { name: "파일 탐색기 탭" })).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "파일 탐색기 탐색" })).not.toBeNull();
    expect(screen.getByRole("complementary", { name: "폴더 사이드바" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "폴더 내용" })).not.toBeNull();
    expect(screen.getByRole("contentinfo", { name: "폴더 상태" }).textContent).toContain(
      "1개 항목 · 1개 선택됨",
    );
  });

  it("tab·주소·Sidebar·view 사용자 입력을 exact owner Action으로 한 번씩 연결한다", () => {
    const fixture = createRuntime();
    renderWindow(fixture.runtime);

    fireEvent.click(screen.getByRole("tab", { name: "Archive" }));
    expect(fixture.windows.execute).toHaveBeenCalledExactlyOnceWith({
      type: "activate-file-explorer-tab",
      sessionId,
      tabId: secondTabId,
    });

    fixture.windows.execute.mockClear();
    fireEvent.click(screen.getByRole("treeitem", { name: "Archive" }));
    expect(
      fixture.windows.execute.mock.calls.filter(([action]) => action.type === "navigate-file-explorer"),
    ).toEqual([
      [
        {
          type: "navigate-file-explorer",
          sessionId,
          tabId: firstTabId,
          target: { kind: "location", location: archive },
        },
      ],
    ]);

    fixture.windows.execute.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "자세히" }));
    expect(fixture.view.execute).toHaveBeenCalledExactlyOnceWith({
      type: "folder-view-settings.update",
      location: blog,
      change: { viewMode: "details" },
    });

    fireEvent.click(screen.getByRole("group", { name: "주소" }));
    const address = screen.getByRole("textbox", { name: "주소" });
    fireEvent.change(address, { target: { value: "/Archive" } });
    fireEvent.submit(screen.getByRole("form", { name: "주소 입력" }));
    expect(
      fixture.windows.execute.mock.calls.filter(
        ([action]) => action.type === "navigate-file-explorer",
      ),
    ).toEqual([
      [
        {
          type: "navigate-file-explorer",
          sessionId,
          tabId: firstTabId,
          target: { kind: "location", location: archive },
        },
      ],
    ]);
  });

  it("mobile projection에는 Sidebar·status·multi-tab controls DOM이 없다", () => {
    const fixture = createRuntime("mobile");
    renderWindow(fixture.runtime);

    expect(screen.queryByRole("tablist", { name: "파일 탐색기 탭" })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "폴더 사이드바" })).toBeNull();
    expect(screen.queryByRole("contentinfo", { name: "폴더 상태" })).toBeNull();
    expect(screen.queryByRole("button", { name: "새 탭" })).toBeNull();
    expect(screen.queryByRole("button", { name: "최소화" })).toBeNull();
    expect(screen.queryByRole("button", { name: "최대화" })).toBeNull();
    expect(screen.getByRole("button", { name: "닫기" })).not.toBeNull();
    expect(screen.getByRole("searchbox", { name: "현재 폴더 검색" })).not.toBeNull();
  });
});
