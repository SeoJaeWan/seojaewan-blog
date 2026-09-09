import { describe, expect, it, vi } from "vitest";

import type {
  ChromeWindowSession,
  WindowFrameState,
  WindowRect,
  WindowState,
} from "../model/index.js";
import type { WindowSessionId } from "../windowSessionId/index.js";
import type { WindowStoreResult } from "../windowStore/index.js";
import { WindowGestures, type WindowGestureStore } from "./index.js";

/** 테스트에서 고정 SessionId를 만든다. */
const id = "10000000-0000-4000-8000-000000000001" as WindowSessionId;

/** frame을 가진 최소 Chrome Session fixture를 만든다. */
const session = (frame: WindowFrameState): ChromeWindowSession => ({
  id,
  kind: "chrome",
  applicationId: "chrome",
  frame,
  tabs: [
    {
      id: "20000000-0000-4000-8000-000000000001" as ChromeWindowSession["activeTabId"],
      navigation: {
        current: { location: { kind: "new-tab" }, scrollTop: 0 },
        backStack: [],
        forwardStack: [],
      },
      reloadRevision: 0,
    },
  ],
  activeTabId: "20000000-0000-4000-8000-000000000001" as ChromeWindowSession["activeTabId"],
});

/** frame을 교체하는 in-memory gesture Store를 만든다. */
const setup = (frame: WindowFrameState, mode: WindowState["mode"] = "desktop") => {
  let state: WindowState = {
    mode,
    workArea: { x: 0, y: 0, width: 1_000, height: 800 },
    sessions: [session(frame)],
    stackingOrder: [id],
    activeSessionId: id,
  };
  const changed = (
    nextFrame: WindowFrameState,
    kind: "window-moved" | "window-resized" | "window-frame-restored",
  ) => {
    state = { ...state, sessions: [session(nextFrame)] };
    return {
      ok: true,
      changed: true,
      change: { kind, sessionId: id },
      value: state,
    } as WindowStoreResult;
  };
  const applyGestureBounds = vi.fn(
    (_id: WindowSessionId, bounds: WindowRect, kind: "move" | "resize") =>
      Promise.resolve(
        changed(
          { ...state.sessions[0].frame, normalBounds: bounds, placement: "normal" },
          kind === "move" ? "window-moved" : "window-resized",
        ),
      ),
  );
  const restoreFrame = vi.fn((_id: WindowSessionId, nextFrame: WindowFrameState) =>
    Promise.resolve(changed(nextFrame, "window-frame-restored")),
  );
  const store: WindowGestureStore = { getSnapshot: () => state, applyGestureBounds, restoreFrame };
  return {
    gestures: new WindowGestures(store),
    applyGestureBounds,
    restoreFrame,
    state: () => state,
  };
};

const normalFrame: WindowFrameState = {
  normalBounds: { x: 100, y: 120, width: 600, height: 400 },
  placement: "normal",
  minimized: false,
};

describe("WindowGestures", () => {
  it("update를 순서대로 반영하고 finish 뒤 늦은 update를 무효화한다", async () => {
    const { gestures, applyGestureBounds, state } = setup(normalFrame);
    const started = gestures.begin({ sessionId: id, kind: "move" });
    if (started.status !== "started") throw new Error("gesture start가 필요합니다");

    await started.handle.update({ x: 130, y: 140, width: 600, height: 400 });
    await expect(started.handle.finish()).resolves.toEqual({ status: "finished" });
    await expect(
      started.handle.update({ x: 900, y: 700, width: 600, height: 400 }),
    ).resolves.toEqual({ status: "inactive" });

    expect(state().sessions[0].frame.normalBounds).toEqual({
      x: 130,
      y: 140,
      width: 600,
      height: 400,
    });
    expect(applyGestureBounds).toHaveBeenCalledTimes(1);
  });

  it("Esc cancel은 접수된 update 뒤 시작 frame 전체를 복구하고 늦은 update를 막는다", async () => {
    const maximizedFrame: WindowFrameState = { ...normalFrame, placement: "maximized" };
    const { gestures, restoreFrame, state } = setup(maximizedFrame);
    const started = gestures.begin({ sessionId: id, kind: "move" });
    if (started.status !== "started") throw new Error("gesture start가 필요합니다");
    expect(started.handle.startBounds).toEqual({ x: 0, y: 0, width: 1_000, height: 800 });

    const update = started.handle.update({ x: 200, y: 40, width: 600, height: 400 });
    const cancelled = started.handle.cancel();
    await expect(update).resolves.toMatchObject({ status: "applied" });
    await expect(cancelled).resolves.toMatchObject({ status: "cancelled" });
    await expect(started.handle.update(normalFrame.normalBounds)).resolves.toEqual({
      status: "inactive",
    });

    expect(state().sessions[0].frame).toEqual(maximizedFrame);
    expect(restoreFrame).toHaveBeenCalledTimes(1);
  });

  it("maximized move 첫 update는 motion 대기 없이 normal placement와 bounds를 함께 전달한다", async () => {
    const { gestures, applyGestureBounds, state } = setup({
      ...normalFrame,
      placement: "maximized",
    });
    const started = gestures.begin({ sessionId: id, kind: "move" });
    if (started.status !== "started") throw new Error("gesture start가 필요합니다");

    await started.handle.update({ x: 250, y: 20, width: 600, height: 400 });

    expect(applyGestureBounds).toHaveBeenCalledTimes(1);
    expect(state().sessions[0].frame).toMatchObject({
      placement: "normal",
      normalBounds: { x: 250, y: 20, width: 600, height: 400 },
    });
  });

  it.each([
    ["mobile", normalFrame, "move", "mobile-mode"],
    ["desktop", { ...normalFrame, minimized: true }, "move", "minimized"],
    ["desktop", { ...normalFrame, placement: "maximized" }, "resize", "maximized-resize"],
  ] as const)("%s mode의 %s gesture 시작 전제를 거절한다", (mode, frame, kind, reason) => {
    const { gestures } = setup(frame, mode);
    expect(gestures.begin({ sessionId: id, kind })).toEqual({ status: "rejected", reason });
  });

  it("runtime의 잘못된 gesture kind를 Store 호출 전에 거절한다", () => {
    const { gestures, applyGestureBounds } = setup(normalFrame);

    expect(gestures.begin({ sessionId: id, kind: "rotate" as never })).toEqual({
      status: "rejected",
      reason: "invalid-kind",
    });
    expect(applyGestureBounds).not.toHaveBeenCalled();
  });
});
