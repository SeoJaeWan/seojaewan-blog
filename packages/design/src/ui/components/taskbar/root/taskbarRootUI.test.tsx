import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import { HeadlessRuntimeProvider } from "../../../../headless/index.js";
import { TaskbarRootUI, type TaskbarRootUIProps } from "./taskbarRootUI.js";

/** UI fixture가 지정한 준비 상태와 공통 mode를 반환하는 최소 runtime을 만든다. */
const createRuntime = (mode?: WindowMode) => {
  const viewModel: ControllerViewModel<WindowState> =
    mode === undefined
      ? Object.freeze({ status: "not-ready", snapshot: null })
      : Object.freeze({
          status: "ready",
          snapshot: Object.freeze({
            mode,
            workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
            sessions: Object.freeze([]),
            stackingOrder: Object.freeze([]),
            activeSessionId: null,
          }),
        });
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute: () => {
      throw new Error("Root 표현 fixture는 Window Action을 실행하지 않습니다");
    },
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;

  const executeRootAction = vi.fn();
  const runtime = Object.freeze({
    taskbarRoot: Object.freeze({ execute: executeRootAction }),
    windows,
  }) as unknown as HeadlessRuntime;

  return { executeRootAction, runtime };
};

/** 실제 provider와 TaskbarRootUI를 지정한 mode로 렌더링한다. */
const renderRoot = (mode?: WindowMode, props: TaskbarRootUIProps = {}) => {
  const fixture = createRuntime(mode);
  const mounted = render(
    <HeadlessRuntimeProvider runtime={fixture.runtime}>
      <TaskbarRootUI {...props} />
    </HeadlessRuntimeProvider>,
  );

  return { ...fixture, ...mounted };
};

afterEach(() => cleanup());

describe("TaskbarRootUI", () => {
  it("desktop mode에서 Windows 버튼을 표시하고 Action을 정확히 한 번 전달한다", () => {
    const { container, executeRootAction } = renderRoot("desktop");
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    const windows = screen.getByRole("button", { name: "시작" });

    expect(taskbar.getAttribute("data-status")).toBe("ready");
    expect(taskbar.getAttribute("data-mode")).toBe("desktop");
    expect(container.querySelector('[data-taskbar-region="items"]')).not.toBeNull();
    expect(taskbar.querySelectorAll("button")).toHaveLength(1);
    expect(windows.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(windows);

    expect(executeRootAction).toHaveBeenCalledExactlyOnceWith({ type: "request-windows" });
  });

  it("Windows selected 표현을 반영하고 disabled 입력은 Action을 전달하지 않는다", () => {
    const selected = renderRoot("desktop", { windowsSelected: true });
    const windows = screen.getByRole("button", { name: "시작" });
    expect(windows.getAttribute("aria-pressed")).toBe("true");
    expect(windows.getAttribute("data-selected")).toBe("true");
    selected.unmount();

    const disabled = renderRoot("desktop", { windowsDisabled: true });
    const disabledWindows = screen.getByRole("button", { name: "시작" });
    fireEvent.click(disabledWindows);
    expect((disabledWindows as HTMLButtonElement).disabled).toBe(true);
    expect(disabled.executeRootAction).not.toHaveBeenCalled();
  });

  it("mobile mode와 준비 전에는 desktop 실행 항목 영역이나 미래 요소를 표시하지 않는다", () => {
    const mobile = renderRoot("mobile");
    expect(
      screen.getByRole("navigation", { name: "작업 표시줄" }).getAttribute("data-mode"),
    ).toBe("mobile");
    expect(mobile.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "시작" })).toBeNull();
    mobile.unmount();

    const notReady = renderRoot();
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    expect(taskbar.getAttribute("data-status")).toBe("not-ready");
    expect(taskbar.hasAttribute("data-mode")).toBe(false);
    expect(notReady.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
  });
});
