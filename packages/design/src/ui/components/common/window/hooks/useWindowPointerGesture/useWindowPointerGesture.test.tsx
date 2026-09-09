import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  WindowControllerActions,
  WindowGestureHandle,
  WindowPlacementConfig,
  WindowSessionId,
} from "../../../../../../headless/windows/index.js";
import { useWindowPointerGesture } from "./index.js";

const placementConfig: WindowPlacementConfig = Object.freeze({
  defaultSize: Object.freeze({ width: 720, height: 520 }),
  minSize: Object.freeze({ width: 240, height: 160 }),
  edgeMargin: 8,
  cascadeOffset: Object.freeze({ x: 24, y: 24 }),
  titlebarRecoverySize: Object.freeze({ width: 120, height: 30 }),
});

/** Hook에 필요한 Window action 묶음을 gesture handle과 함께 만든다. */
const createActions = (handle: WindowGestureHandle) =>
  ({
    execute: vi.fn(),
    beginGesture: vi.fn(() => ({ status: "started", handle }) as const),
    completeTransition: vi.fn(),
    abortTransition: vi.fn(),
    failTransition: vi.fn(),
  }) satisfies WindowControllerActions;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("useWindowPointerGesture", () => {
  it("제목 표시줄 클릭과 1px 흔들림은 이동을 시작하지 않고 임계값 뒤에만 활성화한다", async () => {
    let animationFrame: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrame = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const handle: WindowGestureHandle = {
      sessionId: "window-session:000000000201" as WindowSessionId,
      kind: "move",
      startBounds: { x: 120, y: 0, width: 720, height: 520 },
      startFrame: {
        normalBounds: { x: 120, y: 0, width: 720, height: 520 },
        placement: "normal",
        minimized: false,
      },
      update: vi.fn(() => Promise.resolve({ status: "applied" }) as never),
      finish: vi.fn(() => Promise.resolve({ status: "finished" } as const)),
      cancel: vi.fn(() => Promise.resolve({ status: "cancelled" }) as never),
    };
    const actions = createActions(handle);
    const activated = vi.fn();
    const owner = document.createElement("div");
    owner.setPointerCapture = vi.fn();
    owner.hasPointerCapture = vi.fn(() => true);
    owner.releasePointerCapture = vi.fn();
    document.body.append(owner);
    const { result } = renderHook(() =>
      useWindowPointerGesture(
        actions,
        handle.sessionId,
        { x: 0, y: 0, width: 1_000, height: 800 },
        placementConfig,
        activated,
      ),
    );
    const start = {
      button: 0,
      clientX: 320,
      clientY: 15,
      currentTarget: owner,
      isPrimary: true,
      pointerId: 11,
      preventDefault: vi.fn(),
    } as never;

    act(() => {
      result.current.startMove(start);
    });
    fireEvent.pointerMove(owner, { clientX: 321, clientY: 15, pointerId: 11 });
    fireEvent.pointerUp(owner, { clientX: 321, clientY: 15, pointerId: 11 });
    expect(actions.beginGesture).not.toHaveBeenCalled();
    expect(activated).not.toHaveBeenCalled();
    expect(result.current.active).toBe(false);

    const secondStart = {
      button: 0,
      clientX: 320,
      clientY: 15,
      currentTarget: owner,
      isPrimary: true,
      pointerId: 12,
      preventDefault: vi.fn(),
    } as never;
    act(() => {
      result.current.startMove(secondStart);
    });
    fireEvent.pointerMove(owner, { clientX: 324, clientY: 15, pointerId: 12 });
    act(() => {
      const callback = animationFrame;
      animationFrame = null;
      callback?.(0);
    });
    await act(async () => Promise.resolve());
    expect(actions.beginGesture).toHaveBeenCalledExactlyOnceWith({
      kind: "move",
      sessionId: handle.sessionId,
    });
    expect(activated).toHaveBeenCalledTimes(1);
    expect(result.current.active).toBe(true);
    fireEvent.pointerUp(owner, { clientX: 324, clientY: 15, pointerId: 12 });
  });

  it("화면 밖 창의 아래쪽 resize는 위치를 유지하고 Esc 뒤 pending sample을 버린다", async () => {
    let animationFrame: FrameRequestCallback | null = null;
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      animationFrame = callback;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const update = vi.fn(() => Promise.resolve({ status: "applied" }) as never);
    const finish = vi.fn(() => Promise.resolve({ status: "finished" } as const));
    const cancel = vi.fn(() => Promise.resolve({ status: "cancelled" }) as never);
    const handle: WindowGestureHandle = {
      sessionId: "window-session:000000000201" as WindowSessionId,
      kind: "resize",
      startBounds: { x: -80, y: -40, width: 400, height: 300 },
      startFrame: {
        normalBounds: { x: -80, y: -40, width: 400, height: 300 },
        placement: "normal",
        minimized: false,
      },
      update,
      finish,
      cancel,
    };
    const actions = createActions(handle);
    const owner = document.createElement("button");
    const releasePointerCapture = vi.fn();
    owner.setPointerCapture = vi.fn();
    owner.hasPointerCapture = vi.fn(() => true);
    owner.releasePointerCapture = releasePointerCapture;
    document.body.append(owner);

    const { result } = renderHook(() =>
      useWindowPointerGesture(
        actions,
        handle.sessionId,
        { x: 0, y: 0, width: 1_000, height: 800 },
        placementConfig,
      ),
    );

    act(() => {
      result.current.startResize(
        {
          button: 0,
          clientX: 320,
          clientY: 260,
          currentTarget: owner,
          isPrimary: true,
          pointerId: 13,
          preventDefault: vi.fn(),
        } as never,
        "s",
      );
    });
    fireEvent.pointerMove(owner, { clientX: 320, clientY: 380, pointerId: 13 });
    act(() => {
      const callback = animationFrame;
      animationFrame = null;
      callback?.(0);
    });

    expect(update).toHaveBeenCalledExactlyOnceWith({
      x: -80,
      y: -40,
      width: 400,
      height: 420,
    });

    fireEvent.pointerMove(owner, { clientX: 320, clientY: 420, pointerId: 13 });
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => Promise.resolve());

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(update).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
    expect(releasePointerCapture).toHaveBeenCalledWith(13);
    expect(result.current.active).toBe(false);
  });
});
