import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  TaskbarTimestampClock,
  TaskbarTimestampTimer,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import type { TaskbarApplicationId } from "../../../../headless/index.js";
import { HeadlessRuntimeProvider } from "../../../../headless/index.js";
import { TaskbarRoot, type TaskbarRootProps } from "./taskbarRoot.js";

const TEST_TIMESTAMP_CLOCK: TaskbarTimestampClock = Object.freeze({
  /** Root fixture의 고정 local Date를 반환한다. */
  now: () => new Date(2026, 6, 10, 15, 42, 0, 0),
  /** 실제 timer 없이 fixture의 정지한 clock을 유지한다. */
  setTimeout: () => 0 as unknown as TaskbarTimestampTimer,
  /** 정지한 fixture clock에는 취소할 timer가 없다. */
  clearTimeout: () => undefined,
});

/** UI fixture가 지정한 준비 상태와 공통 mode를 반환하는 최소 runtime을 만든다. */
const createRuntime = (mode?: WindowMode, activeApplication?: TaskbarApplicationId) => {
  const viewModel: ControllerViewModel<WindowState> =
    mode === undefined
      ? Object.freeze({ status: "not-ready", snapshot: null })
      : Object.freeze({
          status: "ready",
          snapshot: Object.freeze({
            mode,
            workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
            sessions:
              activeApplication === undefined
                ? Object.freeze([])
                : Object.freeze([
                    Object.freeze({
                      applicationId: activeApplication,
                    }) as WindowState["sessions"][number],
                  ]),
            stackingOrder: Object.freeze([]),
            activeSessionId: null,
          }),
        });
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute: vi.fn(() => ({}) as never),
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;

  const executeRootAction = vi.fn();
  const runtime = Object.freeze({
    taskbarRoot: Object.freeze({ execute: executeRootAction }),
    windows,
  }) as unknown as HeadlessRuntime;

  return { executeRootAction, executeWindowAction: windows.execute, runtime };
};

/** 실제 provider와 TaskbarRoot를 지정한 mode로 렌더링한다. */
const renderRoot = (
  mode?: WindowMode,
  props: TaskbarRootProps = {},
  activeApplication?: TaskbarApplicationId,
) => {
  const fixture = createRuntime(mode, activeApplication);
  const mounted = render(
    <HeadlessRuntimeProvider runtime={fixture.runtime}>
      <TaskbarRoot timestampClock={TEST_TIMESTAMP_CLOCK} {...props} />
    </HeadlessRuntimeProvider>,
  );

  return { ...fixture, ...mounted };
};

afterEach(() => cleanup());

describe("TaskbarRoot", () => {
  it("Search 입력값을 외부 query 소유자에게 전달하고 초기값을 표시한다", () => {
    const onSearchValueChange = vi.fn();
    const { executeRootAction } = renderRoot("desktop", {
      defaultSearchValue: "이전 검색",
      onSearchValueChange,
    });
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    expect(input.value).toBe("이전 검색");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "새 검색어" } });
    expect(input.value).toBe("새 검색어");
    expect(onSearchValueChange).toHaveBeenLastCalledWith("새 검색어");
    expect(executeRootAction).toHaveBeenCalledExactlyOnceWith({ type: "request-search" });
  });

  it("desktop mode에서 Windows 다음에 Search를 표시하고 각 Action을 한 번 전달한다", () => {
    const { container, executeRootAction } = renderRoot("desktop");
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    const windows = screen.getByRole("button", { name: "시작" });
    const search = screen.getByRole("textbox", { name: "검색" });

    expect(taskbar.getAttribute("data-status")).toBe("ready");
    expect(taskbar.getAttribute("data-mode")).toBe("desktop");
    expect(container.querySelector('[data-taskbar-region="items"]')).not.toBeNull();
    expect(container.querySelector('[data-taskbar-region="desktop-applications"]')).not.toBeNull();
    expect(Array.from(taskbar.querySelectorAll("button, input"))).toEqual([windows, search]);
    expect(screen.getByText("15:42")).not.toBeNull();
    expect(screen.getByText("2026-07-10")).not.toBeNull();
    expect(windows.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(windows);
    expect(executeRootAction).toHaveBeenCalledExactlyOnceWith({ type: "request-windows" });

    fireEvent.focus(search);
    expect(executeRootAction).toHaveBeenNthCalledWith(2, { type: "request-search" });
    expect(executeRootAction).toHaveBeenCalledTimes(2);
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

  it("Search selected 표현은 panel 관계를 만들지 않고 disabled 입력은 Windows와 독립적이다", () => {
    const selected = renderRoot("desktop", { searchSelected: true });
    const search = screen.getByRole("textbox", { name: "검색" });
    expect(search.getAttribute("data-selected")).toBe("true");
    expect(search.hasAttribute("aria-controls")).toBe(false);
    expect(search.hasAttribute("aria-expanded")).toBe(false);
    selected.unmount();

    const disabled = renderRoot("desktop", { searchDisabled: true });
    const disabledSearch = screen.getByRole("textbox", { name: "검색" });
    const windows = screen.getByRole("button", { name: "시작" });
    fireEvent.click(disabledSearch);
    expect((disabledSearch as HTMLButtonElement).disabled).toBe(true);
    expect(disabled.executeRootAction).not.toHaveBeenCalled();

    fireEvent.click(windows);
    expect(disabled.executeRootAction).toHaveBeenCalledExactlyOnceWith({
      type: "request-windows",
    });
  });

  it("mobile mode에서 Explorer·Chrome·Timestamp 순서를 표시하고 각 application Action을 전달한다", () => {
    const mobile = renderRoot("mobile", {}, "chrome");
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    const fileExplorer = screen.getByRole("button", { name: "파일 탐색기" });
    const chrome = screen.getByRole("button", { name: "Chrome" });
    expect(screen.getByRole("navigation", { name: "작업 표시줄" }).getAttribute("data-mode")).toBe(
      "mobile",
    );
    expect(mobile.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
    expect(
      mobile.container.querySelector('[data-taskbar-region="mobile-applications"]'),
    ).not.toBeNull();
    expect(Array.from(taskbar.querySelectorAll("button, input"))).toEqual([fileExplorer, chrome]);
    expect(screen.queryByRole("button", { name: "시작" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "검색" })).toBeNull();
    expect(fileExplorer.getAttribute("aria-pressed")).toBe("false");
    expect(chrome.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("15:42")).not.toBeNull();
    expect(screen.getByText("2026-07-10")).not.toBeNull();

    fireEvent.click(fileExplorer);
    fireEvent.click(chrome);
    expect(mobile.executeWindowAction).toHaveBeenNthCalledWith(1, {
      type: "launch-mobile-application",
      applicationId: "file-explorer",
    });
    expect(mobile.executeWindowAction).toHaveBeenNthCalledWith(2, {
      type: "launch-mobile-application",
      applicationId: "chrome",
    });
    expect(mobile.executeWindowAction).toHaveBeenCalledTimes(2);
    mobile.unmount();
  });

  it("준비 전에는 mode별 요소와 Timestamp를 표시하지 않는다", () => {
    const notReady = renderRoot();
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    expect(taskbar.getAttribute("data-status")).toBe("not-ready");
    expect(taskbar.hasAttribute("data-mode")).toBe(false);
    expect(notReady.container.querySelector('[data-taskbar-region="items"]')).toBeNull();
    expect(notReady.container.querySelector(".taskbar-timestamp")).toBeNull();
  });
});
