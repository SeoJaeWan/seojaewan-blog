import { describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../resources/index.js";
import type { StartSnapshot } from "../../start/model/index.js";
import type { WindowState } from "../../windows/model/index.js";
import { createHeadlessRuntime, type HeadlessRuntimeAdapters } from "./index.js";

const firstWindowSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

const persistedStartSnapshot = Object.freeze({
  pinnedItems: Object.freeze([
    Object.freeze({
      resource: createResourceRef("content", "10000000-0000-4000-8000-000000000001"),
    }),
  ]),
}) satisfies StartSnapshot;

const createDesktopRuntime = () => {
  const windows = {
    getSnapshot: () => firstWindowSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  const start = {
    getSnapshot: () => persistedStartSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["start"]>;
  return createHeadlessRuntime({ adapters: { windows, start } });
};

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

  it("Start close completion 뒤 screen만 reset하고 persisted Pin snapshot을 보존한다", async () => {
    const runtime = createDesktopRuntime();
    runtime.startScreen.execute({ type: "set-view", view: "all" });
    runtime.startScreen.execute({ type: "set-index-open", open: true });
    const pinViewModel = runtime.start.getSnapshot();

    const opening = runtime.primaryPanel.execute({ type: "trigger", panel: "start" });
    await opening.committed;
    expect(runtime.transitions.complete(opening.operationId, "primary-panel-enter")).toBe(true);
    await opening.settled;

    const closing = runtime.primaryPanel.execute({
      type: "dismiss",
      panel: "start",
      reason: "escape",
    });
    await vi.waitFor(() => {
      expect(runtime.primaryPanel.getSnapshot()).toMatchObject({
        status: "ready",
        snapshot: { activePanel: null },
      });
    });
    expect(runtime.startScreen.getSnapshot()).toEqual({
      status: "ready",
      snapshot: { view: "all", indexOpen: true },
    });

    expect(runtime.transitions.complete(closing.operationId, "primary-panel-exit")).toBe(true);
    await closing.settled;

    expect(runtime.startScreen.getSnapshot()).toEqual({
      status: "ready",
      snapshot: { view: "pinned", indexOpen: false },
    });
    expect(runtime.start.getSnapshot()).toBe(pinViewModel);
    expect(runtime.start.getSnapshot()).toEqual({
      status: "ready",
      snapshot: persistedStartSnapshot,
    });
  });

  it("mobile 전환은 panel 활성 여부와 무관하게 Start screen transient state를 reset한다", async () => {
    const runtime = createDesktopRuntime();
    runtime.startScreen.execute({ type: "set-view", view: "all" });
    runtime.startScreen.execute({ type: "set-index-open", open: true });
    const before = runtime.startScreen.getSnapshot();

    await runtime.primaryPanel.execute({ type: "dismiss-for-mobile" }).settled;

    const after = runtime.startScreen.getSnapshot();
    expect(after).not.toBe(before);
    expect(after).toEqual({
      status: "ready",
      snapshot: { view: "pinned", indexOpen: false },
    });
    expect(runtime.start.getSnapshot()).toEqual({
      status: "ready",
      snapshot: persistedStartSnapshot,
    });
  });
});
