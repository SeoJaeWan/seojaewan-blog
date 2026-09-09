import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  PrimaryPanelAction,
  PrimaryPanelOperationHandle,
  PrimaryPanelSnapshot,
  TaskbarTimestampClock,
  TaskbarTimestampTimer,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import type { TaskbarApplicationId } from "../../../../headless/index.js";
import {
  createPrimaryPanelState,
  HeadlessRuntimeProvider,
  PrimaryPanelOperations,
  TransitionRegistry,
} from "../../../../headless/index.js";
import { TaskbarRoot, type TaskbarRootProps } from "./taskbarRoot.js";

const TEST_TIMESTAMP_CLOCK: TaskbarTimestampClock = Object.freeze({
  /** Root fixture의 고정 local Date를 반환한다. */
  now: () => new Date(2026, 6, 10, 15, 42, 0, 0),
  /** 실제 timer 없이 fixture의 정지한 clock을 유지한다. */
  setTimeout: () => 0 as unknown as TaskbarTimestampTimer,
  /** 정지한 fixture clock에는 취소할 timer가 없다. */
  clearTimeout: () => undefined,
});

/** mode와 active application만 가진 immutable WindowState fixture를 만든다. */
const createWindowState = (
  mode: WindowMode,
  activeApplication?: TaskbarApplicationId,
): WindowState =>
  Object.freeze({
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
  });

/** UI fixture가 공통 mode와 실제 primary panel Operation connection을 함께 제공한다. */
const createRuntime = (initialMode?: WindowMode, activeApplication?: TaskbarApplicationId) => {
  let mode = initialMode;
  let viewModel: ControllerViewModel<WindowState> =
    mode === undefined
      ? Object.freeze({ status: "not-ready", snapshot: null })
      : Object.freeze({ status: "ready", snapshot: createWindowState(mode, activeApplication) });
  const windowListeners = new Set<() => void>();
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: (listener: () => void) => {
      windowListeners.add(listener);
      return () => windowListeners.delete(listener);
    },
    execute: vi.fn(() => ({}) as never),
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;

  const primaryPanelState = createPrimaryPanelState();
  const transitions = new TransitionRegistry();
  const primaryPanelOperations = new PrimaryPanelOperations({
    modeReader: { getMode: () => mode ?? "not-ready" },
    state: primaryPanelState,
    transitions,
  });
  const primaryPanelNotReady = Object.freeze({
    status: "not-ready",
    snapshot: null,
  }) satisfies ControllerViewModel<PrimaryPanelSnapshot>;
  let primaryPanelSnapshot = primaryPanelState.getSnapshot();
  let primaryPanelViewModel = Object.freeze({
    status: "ready",
    snapshot: primaryPanelSnapshot,
  }) satisfies ControllerViewModel<PrimaryPanelSnapshot>;
  const primaryPanel = Object.freeze({
    getSnapshot: () => {
      const snapshot = primaryPanelState.getSnapshot();
      if (snapshot !== primaryPanelSnapshot) {
        primaryPanelSnapshot = snapshot;
        primaryPanelViewModel = Object.freeze({ status: "ready", snapshot });
      }
      return primaryPanelViewModel;
    },
    getServerSnapshot: () => primaryPanelNotReady,
    subscribe: primaryPanelState.subscribe,
    execute: (action: PrimaryPanelAction) => primaryPanelOperations.execute(action),
  }) satisfies HeadlessFeatureRuntime<
    PrimaryPanelSnapshot,
    PrimaryPanelAction,
    PrimaryPanelOperationHandle
  >;
  const runtime = Object.freeze({
    primaryPanel,
    transitions,
    windows,
  }) as unknown as HeadlessRuntime;

  return {
    executeWindowAction: windows.execute,
    primaryPanelState,
    runtime,
    /** 새 mode를 Root와 primary panel Operation에 같은 tick으로 반영한다. */
    setMode(nextMode: WindowMode) {
      mode = nextMode;
      viewModel = Object.freeze({ status: "ready", snapshot: createWindowState(nextMode) });
      for (const listener of windowListeners) listener();
    },
  };
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
  it("실제 Taskbar input 하나를 headless Search query와 panel에 연결한다", async () => {
    const mounted = renderRoot("desktop");
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    expect(screen.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);
    fireEvent.focus(input);
    await waitFor(() => expect(mounted.primaryPanelState.getSnapshot().activePanel).toBe("search"));
    fireEvent.change(input, { target: { value: "한글  검색 " } });
    await waitFor(() => expect(input.value).toBe("한글  검색 "));
    expect(mounted.primaryPanelState.getSnapshot().searchQuery).toBe("한글  검색 ");
    expect(screen.getAllByRole("textbox", { name: "검색" })).toHaveLength(1);
  });

  it("desktop mode에서 실제 Start 다음에 Search를 표시하고 active identity를 연결한다", async () => {
    const mounted = renderRoot("desktop");
    const taskbar = screen.getByRole("navigation", { name: "작업 표시줄" });
    const windows = screen.getByRole("button", { name: "시작" });
    const search = screen.getByRole("textbox", { name: "검색" });

    expect(taskbar.getAttribute("data-status")).toBe("ready");
    expect(taskbar.getAttribute("data-mode")).toBe("desktop");
    expect(mounted.container.querySelector('[data-taskbar-region="items"]')).not.toBeNull();
    expect(
      mounted.container.querySelector('[data-taskbar-region="desktop-applications"]'),
    ).not.toBeNull();
    expect(Array.from(taskbar.querySelectorAll("button, input"))).toEqual([windows, search]);
    expect(screen.getByText("15:42")).not.toBeNull();
    expect(screen.getByText("2026-07-10")).not.toBeNull();
    expect(windows.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(windows);
    await waitFor(() => expect(mounted.primaryPanelState.getSnapshot().activePanel).toBe("start"));
    expect(windows.getAttribute("aria-pressed")).toBe("true");
    expect(windows.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "시작" })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "앱 및 문서 검색" })).not.toBeNull();
  });

  it("disabled Start 입력은 panel identity를 바꾸지 않고 Search와 독립적이다", async () => {
    const disabled = renderRoot("desktop", { windowsDisabled: true });
    const disabledWindows = screen.getByRole("button", { name: "시작" });
    fireEvent.click(disabledWindows);
    expect((disabledWindows as HTMLButtonElement).disabled).toBe(true);
    expect(disabled.primaryPanelState.getSnapshot().activePanel).toBeNull();

    const search = screen.getByRole("textbox", { name: "검색" });
    fireEvent.focus(search);
    await waitFor(() => expect(disabled.primaryPanelState.getSnapshot().activePanel).toBe("search"));
  });

  it("desktop Search가 열린 상태에서 mobile로 바뀌면 query와 대기 panel을 정리한다", async () => {
    const mounted = renderRoot("desktop");
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });

    fireEvent.focus(input);
    await waitFor(() => expect(mounted.primaryPanelState.getSnapshot().activePanel).toBe("search"));
    fireEvent.change(input, { target: { value: "mobile 전환" } });
    await waitFor(() =>
      expect(mounted.primaryPanelState.getSnapshot().searchQuery).toBe("mobile 전환"),
    );

    mounted.setMode("mobile");
    await waitFor(() => expect(mounted.primaryPanelState.getSnapshot().activePanel).toBeNull());
    await waitFor(() => expect(mounted.primaryPanelState.getSnapshot().searchQuery).toBe(""));
    expect(screen.queryByRole("textbox", { name: "검색" })).toBeNull();
    expect(screen.getByRole("button", { name: "파일 탐색기" })).not.toBeNull();
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
