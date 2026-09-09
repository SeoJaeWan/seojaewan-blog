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
  let viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const listeners = new Set<() => void>();
  const execute = vi.fn((_action: WindowAction) => ({}) as never);
  const completeTransition = vi.fn(() => true);
  const abortTransition = vi.fn(() => true);
  const failTransition = vi.fn(() => true);
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute,
  }) as unknown as HeadlessFeatureRuntime<WindowState, WindowAction, never>;
  const runtime = Object.freeze({
    windows,
    windowGestures: Object.freeze({ begin: beginGesture }),
    transitions: Object.freeze({
      abort: abortTransition,
      complete: completeTransition,
      fail: failTransition,
    }),
  }) as unknown as HeadlessRuntime;
  /** 새 immutable snapshot을 controller subscriber에 전달한다. */
  const updateSnapshot = (nextSnapshot: WindowState): void => {
    viewModel = Object.freeze({ status: "ready", snapshot: nextSnapshot });
    listeners.forEach((listener) => listener());
  };
  return {
    abortTransition,
    beginGesture,
    completeTransition,
    execute,
    failTransition,
    runtime,
    updateSnapshot,
  };
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

/** 실제 Animation.finished 순서를 test가 직접 제어할 WAAPI handle을 설치한다. */
const installWindowAnimation = (element: HTMLElement) => {
  let resolveFinished: (() => void) | undefined;
  let rejectFinished: ((error: unknown) => void) | undefined;
  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });
  const cancel = vi.fn();
  const animate = vi.fn(
    (_keyframes: Keyframe[] | PropertyIndexedKeyframes, _options?: KeyframeAnimationOptions) =>
      ({
        cancel,
        finished,
      }) as unknown as Animation,
  );
  Object.defineProperty(element, "animate", { configurable: true, value: animate });
  return {
    animate,
    cancel,
    fail: (error: unknown) => rejectFinished?.(error),
    finished,
    finish: () => resolveFinished?.(),
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

  it("측정한 Taskbar icon rect로 최소화 150ms·복원 200ms를 실제 Animation.finished에 연결한다", async () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const binding = createWindowPresentationBinding();
    const { completeTransition, runtime } = createRuntime(
      createSnapshot(fileExplorerId, chromeId),
    );
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          minimizeDestination={{ left: 460, top: 620, width: 30, height: 30 }}
          placementConfig={placementConfig}
          presentationBinding={binding}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          Chrome body
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const frame = screen.getByRole("region", { name: "Chrome 창" });
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      left: 120,
      top: 28,
      width: 720,
      height: 520,
    } as DOMRect);
    const minimizeAnimation = installWindowAnimation(frame);
    const minimize: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-minimize" as OperationId,
      sessionId: chromeId,
      phase: "window-minimize",
    });

    act(() => void binding.present(minimize));
    expect(minimizeAnimation.animate).toHaveBeenCalledTimes(1);
    const [minimizeFrames, minimizeOptions] = minimizeAnimation.animate.mock.calls[0];
    expect(minimizeOptions).toMatchObject({ duration: 150, fill: "both" });
    expect(minimizeFrames).toEqual([
      expect.objectContaining({ opacity: 1, transform: "none" }),
      expect.objectContaining({
        opacity: 0,
        transform: "translate(340px, 592px) scale(0.041666666666666664, 0.057692307692307696)",
      }),
    ]);
    expect(completeTransition).not.toHaveBeenCalled();
    await act(async () => {
      minimizeAnimation.finish();
      await minimizeAnimation.finished;
    });
    expect(completeTransition).toHaveBeenCalledExactlyOnceWith(
      minimize.operationId,
      minimize.phase,
    );

    act(() => binding.release(minimize));
    const restoreAnimation = installWindowAnimation(frame);
    const restore: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-restore" as OperationId,
      sessionId: chromeId,
      phase: "window-restore",
    });
    act(() => void binding.present(restore));
    expect(restoreAnimation.animate.mock.calls[0][1]).toMatchObject({ duration: 200, fill: "both" });
    const restoreFrames = restoreAnimation.animate.mock.calls[0][0] as Keyframe[];
    expect(restoreFrames[0]).toMatchObject({ opacity: 0 });
    expect(restoreFrames[0]?.transform).toContain("translate(340px");
    expect(restoreFrames[1]).toMatchObject({ opacity: 1, transform: "none" });
  });

  it("pending animation unmount는 WAAPI handle과 transition wait를 abort로 정리한다", () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const binding = createWindowPresentationBinding();
    const { abortTransition, completeTransition, runtime } = createRuntime(
      createSnapshot(fileExplorerId, chromeId),
    );
    const view = render(
      <HeadlessRuntimeProvider runtime={runtime}>
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
    const frame = screen.getByRole("region", { name: "Chrome 창" });
    const animation = installWindowAnimation(frame);
    const request: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-exit" as OperationId,
      sessionId: chromeId,
      phase: "window-exit",
    });
    act(() => void binding.present(request));

    view.unmount();
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    expect(abortTransition).toHaveBeenCalledExactlyOnceWith(
      request.operationId,
      request.phase,
      "window-component-unmounted-or-presentation-replaced",
    );
    expect(completeTransition).not.toHaveBeenCalled();
  });

  it("WAAPI rejection은 정상 완료로 위장하지 않고 exact transition failure로 정리한다", async () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const binding = createWindowPresentationBinding();
    const { completeTransition, failTransition, runtime } = createRuntime(
      createSnapshot(fileExplorerId, chromeId),
    );
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
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
    const frame = screen.getByRole("region", { name: "Chrome 창" });
    const animation = installWindowAnimation(frame);
    const request: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-failed" as OperationId,
      sessionId: chromeId,
      phase: "window-exit",
    });
    const error = new Error("animation failed");
    act(() => void binding.present(request));

    await act(async () => {
      animation.fail(error);
      await expect(animation.finished).rejects.toBe(error);
    });
    expect(failTransition).toHaveBeenCalledExactlyOnceWith(
      request.operationId,
      request.phase,
      error,
    );
    expect(completeTransition).not.toHaveBeenCalled();
  });

  it("bounds WAAPI 중 pointer gesture 시작은 animation wait만 abort하고 rAF bounds를 즉시 전달한다", () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const snapshot = createSnapshot(fileExplorerId, chromeId);
    const gesture = createGestureHandle("move", snapshot.sessions[1].frame, {
      x: 0,
      y: 0,
      width: 1_000,
      height: 700,
    });
    const beginGesture = vi.fn(() => ({ status: "started", handle: gesture.handle }) as const);
    const binding = createWindowPresentationBinding();
    const { abortTransition, completeTransition, runtime } = createRuntime(snapshot, beginGesture);
    const animationFrame = installAnimationFrame();
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
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
    const frame = screen.getByRole("region", { name: "Chrome 창" });
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1_000,
      height: 700,
    } as DOMRect);
    const animation = installWindowAnimation(frame);
    const request: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-maximize" as OperationId,
      sessionId: chromeId,
      phase: "window-maximize",
    });
    act(() => void binding.present(request));
    const dragRegion = frame.querySelector<HTMLElement>("[data-window-drag-region]");

    fireEvent.pointerDown(dragRegion!, {
      button: 0,
      clientX: 250,
      clientY: 15,
      isPrimary: true,
      pointerId: 41,
    });
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    expect(abortTransition).toHaveBeenCalledExactlyOnceWith(
      request.operationId,
      request.phase,
      "window-presentation-interrupted-by-gesture",
    );
    expect(completeTransition).not.toHaveBeenCalled();
    fireEvent.pointerMove(dragRegion!, { clientX: 400, clientY: 25, pointerId: 41 });
    act(() => animationFrame.flush());
    expect(gesture.update).toHaveBeenCalledExactlyOnceWith({
      x: 220,
      y: 10,
      width: 720,
      height: 520,
    });
  });

  it("reduced motion은 WAAPI 없이 현재 operation ID·phase를 즉시 완료한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }) as MediaQueryList),
    );
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const binding = createWindowPresentationBinding();
    const { completeTransition, runtime } = createRuntime(
      createSnapshot(fileExplorerId, chromeId),
    );
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
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
    const request: WindowPresentationRequest = Object.freeze({
      operationId: "window-operation-reduced" as OperationId,
      sessionId: chromeId,
      phase: "window-enter",
    });

    act(() => void binding.present(request));
    expect(completeTransition).toHaveBeenCalledExactlyOnceWith(
      request.operationId,
      request.phase,
    );
  });

  it("최소화 content를 mounted 상태로 숨기고 다음 창과 복원 focus를 연결한다", () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const initial = createSnapshot(fileExplorerId, chromeId);
    const { runtime, updateSnapshot } = createRuntime(initial);
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
          <div data-testid="chrome-scroll" style={{ height: 20, overflow: "auto" }}>
            <input aria-label="주소" defaultValue="보존된 입력" />
            <div style={{ height: 100 }} />
          </div>
        </WindowRoot>
      </HeadlessRuntimeProvider>,
    );
    const chrome = screen.getByRole("region", { name: "Chrome 창" });
    const address = screen.getByRole<HTMLInputElement>("textbox", { name: "주소" });
    const scroll = screen.getByTestId("chrome-scroll");
    address.focus();
    address.value = "수정한 입력";
    scroll.scrollTop = 37;
    within(chrome).getByRole("button", { name: "최소화" }).focus();

    const minimized = Object.freeze({
      ...initial,
      sessions: Object.freeze(
        initial.sessions.map((session) =>
          session.id === chromeId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({ ...session.frame, minimized: true }),
              })
            : session,
        ),
      ),
      activeSessionId: fileExplorerId,
    });
    act(() => updateSnapshot(minimized));
    const mountedChrome = document.querySelector<HTMLElement>('[aria-label="Chrome 창"]');
    const explorer = screen.getByRole("region", { name: "파일 탐색기 창" });
    expect(mountedChrome).not.toBeNull();
    expect(mountedChrome?.hasAttribute("hidden")).toBe(true);
    expect(mountedChrome?.hasAttribute("inert")).toBe(true);
    expect(mountedChrome?.getAttribute("aria-hidden")).toBe("true");
    expect(address.value).toBe("수정한 입력");
    expect(scroll.scrollTop).toBe(37);
    expect(document.activeElement).toBe(explorer);

    const restored = Object.freeze({
      ...minimized,
      sessions: Object.freeze(
        minimized.sessions.map((session) =>
          session.id === chromeId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({ ...session.frame, minimized: false }),
              })
            : session,
        ),
      ),
      activeSessionId: chromeId,
    });
    act(() => updateSnapshot(restored));
    expect(document.activeElement).toBe(address);
    expect(address.value).toBe("수정한 입력");
    expect(scroll.scrollTop).toBe(37);
  });

  it("마지막 visible 창 최소화는 focus를 Taskbar로 옮기지 않고 body에 잃은 상태로 둔다", () => {
    const fileExplorerId = sessionId("000000000105");
    const chromeId = sessionId("000000000106");
    const initial = createSnapshot(fileExplorerId, chromeId);
    const chromeOnly = Object.freeze({
      ...initial,
      sessions: Object.freeze([initial.sessions[1]]),
      stackingOrder: Object.freeze([chromeId]),
      activeSessionId: chromeId,
    });
    const { runtime, updateSnapshot } = createRuntime(chromeOnly);
    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="Chrome 창"
          placementConfig={placementConfig}
          sessionId={chromeId}
          titleBarContent="Chrome"
        >
          <input aria-label="주소" />
        </WindowRoot>
        <button aria-label="Taskbar fixture" type="button">
          Taskbar
        </button>
      </HeadlessRuntimeProvider>,
    );
    screen.getByRole("textbox", { name: "주소" }).focus();
    const minimized = Object.freeze({
      ...chromeOnly,
      sessions: Object.freeze([
        Object.freeze({
          ...chromeOnly.sessions[0],
          frame: Object.freeze({ ...chromeOnly.sessions[0].frame, minimized: true }),
        }),
      ]),
      activeSessionId: null,
    });

    act(() => updateSnapshot(minimized));
    expect(document.activeElement).toBe(document.body);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Taskbar fixture" }));
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
