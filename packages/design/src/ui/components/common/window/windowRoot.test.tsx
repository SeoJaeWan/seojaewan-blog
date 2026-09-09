import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ControllerViewModel,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  HeadlessRuntimeProvider,
  type OperationId,
  type WindowAction,
  type WindowGestureHandle,
  type WindowGestureKind,
  type WindowGestureRequest,
  type WindowGestureStartResult,
  type WindowPlacementConfig,
  type WindowPresentationRequest,
  type WindowSessionId,
  type WindowState,
} from "../../../../headless/index.js";
import { createWindowPresentationBinding, WindowRoot } from "./index.js";

/** 읽을 수 있는 테스트용 WindowSession identity를 branded public type으로 만든다. */
const sessionId = (suffix: string) => `00000000-0000-4000-8000-${suffix}` as WindowSessionId;

const placementConfig: WindowPlacementConfig = Object.freeze({
  defaultSize: Object.freeze({ width: 840, height: 500 }),
  minSize: Object.freeze({ width: 320, height: 240 }),
  edgeMargin: 8,
  cascadeOffset: Object.freeze({ x: 24, y: 24 }),
  titlebarRecoverySize: Object.freeze({ width: 120, height: 30 }),
});

/** 두 제품 frame의 active·stacking·placement 투영을 관찰할 ready snapshot을 만든다. */
const createSnapshot = (fileExplorerId: WindowSessionId, chromeId: WindowSessionId): WindowState =>
  Object.freeze({
    mode: "desktop",
    workArea: Object.freeze({ x: 0, y: 0, width: 1_000, height: 700 }),
    sessions: Object.freeze([
      Object.freeze({
        id: fileExplorerId,
        kind: "file-explorer",
        applicationId: "file-explorer",
        frame: Object.freeze({
          normalBounds: Object.freeze({ x: 48, y: 36, width: 840, height: 500 }),
          placement: "normal",
          minimized: false,
        }),
        tabs: Object.freeze([]),
        activeTabId: "file-tab" as never,
      }),
      Object.freeze({
        id: chromeId,
        kind: "chrome",
        applicationId: "chrome",
        frame: Object.freeze({
          normalBounds: Object.freeze({ x: 120, y: 28, width: 720, height: 520 }),
          placement: "maximized",
          minimized: false,
        }),
        tabs: Object.freeze([]),
        activeTabId: "chrome-tab" as never,
      }),
    ]),
    stackingOrder: Object.freeze([fileExplorerId, chromeId]),
    activeSessionId: chromeId,
  });

/** 지정 snapshot과 Action spy를 실제 Window controller hook이 소비할 runtime으로 감싼다. */
const createRuntime = (
  snapshot: WindowState,
  beginGesture: (request: WindowGestureRequest) => WindowGestureStartResult = vi.fn(
    (): WindowGestureStartResult => ({ status: "rejected", reason: "invalid-kind" }),
  ),
) => {
  const viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const execute = vi.fn((_action: WindowAction) => ({}) as never);
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute,
  }) as unknown as HeadlessFeatureRuntime<WindowState, WindowAction, never>;
  const runtime = Object.freeze({
    windows,
    windowGestures: Object.freeze({ begin: beginGesture }),
  }) as unknown as HeadlessRuntime;
  return { beginGesture, execute, runtime };
};

/** 지정 frame에서 시작하는 DOM-free gesture Handle spy를 만든다. */
const createGestureHandle = (
  kind: WindowGestureKind,
  frame: WindowState["sessions"][number]["frame"],
  startBounds = frame.normalBounds,
) => {
  const update = vi.fn(() => Promise.resolve({ status: "applied" }) as never);
  const finish = vi.fn(() => Promise.resolve({ status: "finished" } as const));
  const cancel = vi.fn(() => Promise.resolve({ status: "cancelled" }) as never);
  const handle: WindowGestureHandle = Object.freeze({
    sessionId: sessionId("000000000102"),
    kind,
    startBounds,
    startFrame: frame,
    update,
    finish,
    cancel,
  });
  return { cancel, finish, handle, update };
};

/** requestAnimationFrame callback을 test가 정확히 한 frame씩 실행할 수 있게 보관한다. */
const installAnimationFrame = () => {
  let callback: FrameRequestCallback | null = null;
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => {
    callback = next;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return {
    cancel,
    flush: () => {
      const next = callback;
      callback = null;
      next?.(0);
    },
  };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WindowRoot", () => {
  it("두 제품 Session의 active·bounds·placement·stacking을 Common Window props로 투영한다", () => {
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId));

    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="파일 탐색기 창"
          placementConfig={placementConfig}
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          Explorer body
        </WindowRoot>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );

    const fileExplorer = screen.getByRole("region", { name: "파일 탐색기 창" });
    expect(fileExplorer.getAttribute("data-variant")).toBe("file-explorer");
    expect(fileExplorer.getAttribute("data-active")).toBe("false");
    expect(fileExplorer.getAttribute("data-maximized")).toBe("false");
    expect(fileExplorer.getAttribute("style")).toContain("--wd-window-frame-runtime-left: 48px");
    expect(fileExplorer.getAttribute("style")).toContain("z-index: 1");

    const chrome = screen.getByRole("region", { name: "Chrome 창" });
    expect(chrome.getAttribute("data-variant")).toBe("chrome");
    expect(chrome.getAttribute("data-active")).toBe("true");
    expect(chrome.getAttribute("data-maximized")).toBe("true");
    expect(chrome.getAttribute("style")).toContain("--wd-window-frame-runtime-width: 1000px");
    expect(chrome.getAttribute("style")).toContain("z-index: 2");
  });

  it("pointer·focus activation과 controls를 기존 WindowAction에 정확한 Session으로 전달한다", () => {
    const fileExplorerId = sessionId("000000000103");
    const chromeId = sessionId("000000000104");
    const { execute, runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId));
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="파일 탐색기 창"
          placementConfig={placementConfig}
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          <input aria-label="주소" />
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );

    const frame = screen.getByRole("region", { name: "파일 탐색기 창" });
    const address = screen.getByRole("textbox", { name: "주소" });
    fireEvent.pointerDown(frame);
    fireEvent.focus(address);
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "activate",
      sessionId: fileExplorerId,
    });

    fireEvent.click(within(frame).getByRole("button", { name: "최소화" }));
    fireEvent.click(within(frame).getByRole("button", { name: "최대화" }));
    fireEvent.click(within(frame).getByRole("button", { name: "닫기" }));
    expect(execute).toHaveBeenNthCalledWith(2, { type: "minimize", sessionId: fileExplorerId });
    expect(execute).toHaveBeenNthCalledWith(3, {
      type: "toggle-maximize",
      sessionId: fileExplorerId,
    });
    expect(execute).toHaveBeenNthCalledWith(4, { type: "close", sessionId: fileExplorerId });
  });

  it("새 Window mount 전 numeric presentation 요청을 같은 Session root에 보관한다", () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const binding = createWindowPresentationBinding();
    const request: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-retained" as OperationId,
      sessionId: chromeId,
      phase: "window-enter",
    });
    void binding.present(request);
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId));

    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="파일 탐색기 창"
          placementConfig={placementConfig}
          presentationBinding={binding}
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          Explorer body
        </WindowRoot>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          presentationBinding={binding}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );

    const fileExplorer = screen.getByRole("region", { name: "파일 탐색기 창" });
    const chrome = screen.getByRole("region", { name: "Chrome 창" });
    expect(fileExplorer.hasAttribute("data-presentation-operation-id")).toBe(false);
    expect(chrome.getAttribute("data-presentation-operation-id")).toBe(request.operationId);
    expect(chrome.getAttribute("data-presentation-phase")).toBe("window-enter");

    act(() => binding.release(request));
    expect(chrome.hasAttribute("data-presentation-operation-id")).toBe(false);
    expect(chrome.hasAttribute("data-presentation-phase")).toBe(false);
  });

  it("move pointer를 animation frame마다 최신 numeric bounds로 전달하고 Esc로 시작 frame을 복구한다", async () => {
    const startFrame = Object.freeze({
      normalBounds: Object.freeze({ x: 120, y: 28, width: 720, height: 520 }),
      placement: "normal" as const,
      minimized: false,
    });
    const gesture = createGestureHandle("move", startFrame);
    const beginGesture = vi.fn(() => ({ status: "started", handle: gesture.handle }) as const);
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId), beginGesture);
    const animationFrame = installAnimationFrame();

    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );

    const frameElement = screen.getByRole("region", { name: "Chrome 창" });
    const dragRegion = frameElement.querySelector<HTMLElement>("[data-window-drag-region]");
    fireEvent.pointerDown(dragRegion!, {
      button: 0,
      clientX: 160,
      clientY: 48,
      isPrimary: true,
      pointerId: 7,
    });
    fireEvent.pointerMove(dragRegion!, { clientX: 180, clientY: 58, pointerId: 7 });
    fireEvent.pointerMove(dragRegion!, { clientX: 200, clientY: 68, pointerId: 7 });
    expect(gesture.update).not.toHaveBeenCalled();
    act(() => animationFrame.flush());
    expect(gesture.update).toHaveBeenCalledExactlyOnceWith({
      x: 160,
      y: 48,
      width: 720,
      height: 520,
    });
    expect(frameElement.getAttribute("data-gesture-active")).toBe("true");

    fireEvent.pointerMove(dragRegion!, { clientX: 240, clientY: 88, pointerId: 7 });
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => Promise.resolve());
    expect(animationFrame.cancel).toHaveBeenCalledWith(1);
    expect(gesture.update).toHaveBeenCalledTimes(1);
    expect(gesture.cancel).toHaveBeenCalledTimes(1);
    expect(gesture.finish).not.toHaveBeenCalled();
    expect(frameElement.hasAttribute("data-gesture-active")).toBe(false);
  });

  it("maximized titlebar drag는 잡은 가로 비율과 세로 위치를 normalBounds에 유지한다", async () => {
    const startFrame = Object.freeze({
      normalBounds: Object.freeze({ x: 120, y: 28, width: 720, height: 520 }),
      placement: "maximized" as const,
      minimized: false,
    });
    const gesture = createGestureHandle(
      "move",
      startFrame,
      Object.freeze({ x: 0, y: 0, width: 1_000, height: 700 }),
    );
    const beginGesture = vi.fn(() => ({ status: "started", handle: gesture.handle }) as const);
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId), beginGesture);
    const animationFrame = installAnimationFrame();

    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const dragRegion = screen
      .getByRole("region", { name: "Chrome 창" })
      .querySelector<HTMLElement>("[data-window-drag-region]");
    fireEvent.pointerDown(dragRegion!, {
      button: 0,
      clientX: 250,
      clientY: 15,
      isPrimary: true,
      pointerId: 8,
    });
    fireEvent.pointerMove(dragRegion!, { clientX: 400, clientY: 25, pointerId: 8 });
    act(() => animationFrame.flush());
    expect(gesture.update).toHaveBeenCalledExactlyOnceWith({
      x: 220,
      y: 10,
      width: 720,
      height: 520,
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await act(async () => Promise.resolve());
    expect(gesture.cancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["n", { x: 48, y: 46, width: 840, height: 490 }],
    ["s", { x: 48, y: 36, width: 840, height: 510 }],
    ["w", { x: 68, y: 36, width: 820, height: 500 }],
    ["e", { x: 48, y: 36, width: 860, height: 500 }],
    ["nw", { x: 68, y: 46, width: 820, height: 490 }],
    ["ne", { x: 48, y: 46, width: 860, height: 490 }],
    ["sw", { x: 68, y: 36, width: 820, height: 510 }],
    ["se", { x: 48, y: 36, width: 860, height: 510 }],
  ] as const)("%s resize는 반대쪽 변을 고정한 atomic bounds를 전달한다", (direction, expected) => {
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const startFrame = createSnapshot(fileExplorerId, chromeId).sessions[0].frame;
    const gesture = createGestureHandle("resize", startFrame);
    const beginGesture = vi.fn(() => ({ status: "started", handle: gesture.handle }) as const);
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId), beginGesture);
    const animationFrame = installAnimationFrame();
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="파일 탐색기 창"
          placementConfig={placementConfig}
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          Explorer body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const handle = document.querySelector<HTMLElement>(`[data-direction="${direction}"]`);
    fireEvent.pointerDown(handle!, {
      button: 0,
      clientX: 0,
      clientY: 0,
      isPrimary: true,
      pointerId: 9,
    });
    fireEvent.pointerMove(handle!, { clientX: 20, clientY: 10, pointerId: 9 });
    act(() => animationFrame.flush());
    expect(gesture.update).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("interactive titlebar child는 drag·doubleclick을 가로채지 않고 내부 동작을 유지한다", () => {
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const { beginGesture, execute, runtime } = createRuntime(
      createSnapshot(fileExplorerId, chromeId),
    );
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent={<input aria-label="탭 이름" defaultValue="Chrome" />}
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const titleInput = screen.getByRole("textbox", { name: "탭 이름" });
    fireEvent.pointerDown(titleInput, { button: 0, isPrimary: true, pointerId: 10 });
    fireEvent.doubleClick(titleInput);
    expect(beginGesture).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect((titleInput as HTMLInputElement).value).toBe("Chrome");
  });

  it("pointer capture 상실과 unmount는 rollback 없이 listener와 gesture를 정리한다", async () => {
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const snapshot = createSnapshot(fileExplorerId, chromeId);
    const firstGesture = createGestureHandle("move", snapshot.sessions[1].frame);
    const secondGesture = createGestureHandle("move", snapshot.sessions[1].frame);
    const beginGesture = vi
      .fn()
      .mockReturnValueOnce({ status: "started", handle: firstGesture.handle })
      .mockReturnValueOnce({ status: "started", handle: secondGesture.handle });
    const { runtime } = createRuntime(snapshot, beginGesture);
    installAnimationFrame();
    const view = render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const dragRegion = screen
      .getByRole("region", { name: "Chrome 창" })
      .querySelector<HTMLElement>("[data-window-drag-region]");
    fireEvent.pointerDown(dragRegion!, { button: 0, isPrimary: true, pointerId: 11 });
    fireEvent.lostPointerCapture(dragRegion!, { pointerId: 11 });
    await act(async () => Promise.resolve());
    expect(firstGesture.finish).toHaveBeenCalledTimes(1);
    expect(firstGesture.cancel).not.toHaveBeenCalled();

    fireEvent.pointerDown(dragRegion!, { button: 0, isPrimary: true, pointerId: 12 });
    view.unmount();
    await act(async () => Promise.resolve());
    expect(secondGesture.finish).toHaveBeenCalledTimes(1);
    expect(secondGesture.cancel).not.toHaveBeenCalled();
  });
});
