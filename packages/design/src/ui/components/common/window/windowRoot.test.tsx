import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ControllerViewModel,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  HeadlessRuntimeProvider,
  type OperationId,
  type WindowAction,
  type WindowPresentationRequest,
  type WindowSessionId,
  type WindowState,
} from "../../../../headless/index.js";
import { createWindowPresentationBinding, WindowRoot } from "./index.js";

/** 읽을 수 있는 테스트용 WindowSession identity를 branded public type으로 만든다. */
const sessionId = (suffix: string) => `00000000-0000-4000-8000-${suffix}` as WindowSessionId;

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
const createRuntime = (snapshot: WindowState) => {
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
  const runtime = Object.freeze({ windows }) as unknown as HeadlessRuntime;
  return { execute, runtime };
};

afterEach(() => cleanup());

describe("WindowRoot", () => {
  it("두 제품 Session의 active·bounds·placement·stacking을 Common Window props로 투영한다", () => {
    const fileExplorerId = sessionId("000000000101");
    const chromeId = sessionId("000000000102");
    const { runtime } = createRuntime(createSnapshot(fileExplorerId, chromeId));

    render(
      <HeadlessRuntimeProvider runtime={runtime}>
        <WindowRoot
          aria-label="파일 탐색기 창"
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          Explorer body
        </WindowRoot>
        <WindowRoot aria-label="Chrome 창" sessionId={chromeId} titleBarContent="Chrome">
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
          presentationBinding={binding}
          sessionId={fileExplorerId}
          titleBarContent="파일 탐색기"
        >
          Explorer body
        </WindowRoot>
        <WindowRoot
          aria-label="Chrome 창"
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
});
