import { describe, expect, it, vi } from "vitest";

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
});
