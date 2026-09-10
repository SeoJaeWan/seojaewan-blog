import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettingsSnapshot,
} from "../../folders/index.js";
import { createResourceRef, createStaticCatalog } from "../../resources/index.js";
import type { WindowState } from "../../windows/model/index.js";
import { createHeadlessRuntime, type HeadlessRuntimeAdapters } from "./index.js";

const firstWindowSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

describe("createHeadlessRuntime", () => {
  it("서버 snapshot은 Store를 읽지 않고 같은 준비 전 객체를 반환한다", () => {
    const getSnapshot = vi.fn(() => firstWindowSnapshot);
    const windows = {
      getSnapshot,
      subscribe: vi.fn(() => () => undefined),
    } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
    const runtime = createHeadlessRuntime({ adapters: { windows } });

    const first = runtime.windows.getServerSnapshot();
    const second = runtime.windows.getServerSnapshot();

    expect(first).toBe(second);
    expect(first).toEqual({ status: "not-ready", snapshot: null });
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("브라우저 Store 초기화 전 오류를 안정적인 준비 전 View Model로 바꾼다", () => {
    const notInitialized = new Error("초기화 전");
    notInitialized.name = "WindowStoreNotInitializedError";
    const windows = {
      getSnapshot: () => {
        throw notInitialized;
      },
      subscribe: () => () => undefined,
    } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
    const runtime = createHeadlessRuntime({ adapters: { windows } });

    const first = runtime.windows.getSnapshot();
    expect(runtime.windows.getSnapshot()).toBe(first);
    expect(first).toEqual({ status: "not-ready", snapshot: null });
  });

  it("Store가 같은 immutable snapshot을 반환하면 View Model identity를 유지한다", () => {
    let snapshot: WindowState = firstWindowSnapshot;
    const windows = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
    const runtime = createHeadlessRuntime({ adapters: { windows } });

    const first = runtime.windows.getSnapshot();
    expect(runtime.windows.getSnapshot()).toBe(first);

    snapshot = Object.freeze({ ...firstWindowSnapshot, mode: "mobile" });
    const updated = runtime.windows.getSnapshot();
    expect(updated).not.toBe(first);
    expect(updated).toEqual({ status: "ready", snapshot });
  });

  it("runtime마다 primary panel transient snapshot을 독립적으로 소유한다", async () => {
    const first = createHeadlessRuntime();
    const second = createHeadlessRuntime();

    await first.primaryPanel.execute({
      type: "update-query",
      panel: "search",
      query: "첫 runtime",
    }).settled;

    expect(first.primaryPanel.getSnapshot()).toEqual({
      status: "ready",
      snapshot: { activePanel: null, startQuery: "", searchQuery: "첫 runtime" },
    });
    expect(second.primaryPanel.getSnapshot()).toEqual({
      status: "ready",
      snapshot: { activePanel: null, startQuery: "", searchQuery: "" },
    });
  });

  it("주입한 File Explorer Catalog와 view settings Store를 동일 runtime channel로 보존한다", async () => {
    const content = Object.freeze({
      ref: createResourceRef("content", "40000000-0000-4000-8000-000000000001"),
      title: "Entry",
      slug: "entry",
      summary: "",
      date: "2026-09-10",
      tags: Object.freeze([]),
      cover: null,
      source: Object.freeze({ kind: "notion" as const, pageId: "page-1" }),
    });
    const externalShortcut = createStaticCatalog([]);
    const resources = Object.freeze({
      content: createStaticCatalog([content]),
      externalShortcut,
    });
    const snapshot: FolderViewSettingsSnapshot = Object.freeze({
      surface: "desktop",
      entries: Object.freeze([]),
    });
    const dispatch = vi.fn(() => Promise.resolve({ ok: false as const, reason: "no-op" as const }));
    const folderViewSettings = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      dispatch,
    } as NonNullable<HeadlessRuntimeAdapters["folderViewSettings"]>;
    const runtime = createHeadlessRuntime({
      adapters: { folderViewSettings },
      fileExplorerResources: resources,
    });

    expect(runtime.fileExplorerResources).toBe(resources);
    expect(runtime.folderViewSettings.getSnapshot()).toEqual({ status: "ready", snapshot });
    await runtime.folderViewSettings.execute({
      type: "folder-view-settings.update",
      location: null,
      change: { viewMode: DEFAULT_FOLDER_VIEW_SETTINGS.viewMode },
    });
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "folder-view-settings.update",
      location: null,
      change: { viewMode: "medium-icons" },
    });
  });
});
