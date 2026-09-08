import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import { HeadlessRuntimeProvider } from "../../../../headless/index.js";
import { TaskbarRootUI } from "./taskbarRootUI.js";

/** UI fixture가 지정한 준비 상태와 공통 mode를 반환하는 최소 runtime을 만든다. */
const createRuntime = (mode?: WindowMode): HeadlessRuntime => {
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

  return Object.freeze({ windows }) as unknown as HeadlessRuntime;
};

/** 실제 provider와 TaskbarRootUI를 지정한 mode로 렌더링한다. */
const renderRoot = (mode?: WindowMode) =>
  render(
    <HeadlessRuntimeProvider runtime={createRuntime(mode)}>
      <TaskbarRootUI />
    </HeadlessRuntimeProvider>,
  );

afterEach(() => cleanup());

describe("TaskbarRootUI", () => {
  it("desktop mode에서 하단 navigation과 빈 실행 항목 배치 영역을 표시한다", () => {
    const { container } = renderRoot("desktop");
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });

    expect(taskbar.getAttribute("data-status")).toBe("ready");
    expect(taskbar.getAttribute("data-mode")).toBe("desktop");
    expect(container.querySelector('[data-taskbar-region="items"]')).not.toBeNull();
    expect(taskbar.querySelectorAll("button, time, input")).toHaveLength(0);
  });

  it("mobile mode와 준비 전에는 desktop 실행 항목 영역이나 미래 요소를 표시하지 않는다", () => {
    const mobile = renderRoot("mobile");
    expect(
      screen.getByRole("navigation", { name: "작업 표시줄" }).getAttribute("data-mode"),
    ).toBe("mobile");
    expect(mobile.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
    mobile.unmount();

    const notReady = renderRoot();
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    expect(taskbar.getAttribute("data-status")).toBe("not-ready");
    expect(taskbar.hasAttribute("data-mode")).toBe(false);
    expect(notReady.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
  });
});
