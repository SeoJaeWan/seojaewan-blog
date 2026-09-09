import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
} from "../../runtime/index.js";
import { HeadlessRuntimeProvider } from "../../runtime/index.js";
import type { WindowMode, WindowState } from "../../windows/index.js";
import {
  createTaskbarSearchAction,
  createTaskbarWindowsAction,
  selectTaskbarRootSnapshot,
  useTaskbarRootController,
} from "../index.js";
import type { TaskbarApplicationId } from "../model/index.js";

/** mode 외 상태가 비어 있는 immutable WindowState fixture를 만든다. */
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
            Object.freeze({ applicationId: activeApplication }) as WindowState["sessions"][number],
          ]),
    stackingOrder: Object.freeze([]),
    activeSessionId: null,
  });

/** Root controller test가 Window snapshot과 구독 lifecycle을 제어하게 한다. */
const createRuntimeFixture = (mode: WindowMode, activeApplication?: TaskbarApplicationId) => {
  let viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot: createWindowState(mode, activeApplication),
  });
  const serverViewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "not-ready",
    snapshot: null,
  });
  const listeners = new Set<() => void>();
  const getSnapshot = vi.fn(() => viewModel);
  const getServerSnapshot = vi.fn(() => serverViewModel);
  const windows = Object.freeze({
    getSnapshot,
    getServerSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute: vi.fn(() => ({}) as never),
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;
  const executeRootAction = vi.fn();
  const executePrimaryPanelAction = vi.fn(() => ({}) as never);
  const runtime = Object.freeze({
    primaryPanel: Object.freeze({ execute: executePrimaryPanelAction }),
    taskbarRoot: Object.freeze({ execute: executeRootAction }),
    windows,
  }) as unknown as HeadlessRuntime;

  return {
    getSnapshot,
    getServerSnapshot,
    executePrimaryPanelAction,
    executeRootAction,
    executeWindowAction: windows.execute,
    listenerCount: () => listeners.size,
    runtime,
    /** 새 공통 mode를 반영하고 현재 Window 구독자에게 알린다. */
    setMode(nextMode: WindowMode) {
      viewModel = Object.freeze({
        status: "ready",
        snapshot: createWindowState(nextMode),
      });
      for (const listener of listeners) listener();
    },
  };
};

afterEach(() => cleanup());

describe("selectTaskbarRootSnapshot", () => {
  it("공통 mode와 active application을 mobile 고정 순서로 투영한다", () => {
    expect(selectTaskbarRootSnapshot(createWindowState("mobile", "chrome"))).toEqual({
      mode: "mobile",
      mobileView: [
        {
          kind: "application",
          applicationId: "file-explorer",
          label: "파일 탐색기",
          active: false,
        },
        { kind: "application", applicationId: "chrome", label: "Chrome", active: true },
        { kind: "timestamp" },
      ],
    });
  });
});

describe("useTaskbarRootController", () => {
  it("Windows와 Search Action을 같은 identity의 primary panel Operation에 전달한다", () => {
    const fixture = createRuntimeFixture("desktop");
    let execute: ReturnType<typeof useTaskbarRootController>["actions"]["execute"] = () =>
      undefined;

    /** Root controller의 public Action 실행 함수를 test 경계에 노출한다. */
    const Probe = () => {
      execute = useTaskbarRootController().actions.execute;
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    const action = createTaskbarWindowsAction();

    act(() => execute(action));
    const searchAction = createTaskbarSearchAction();
    act(() => execute(searchAction));

    expect(fixture.executePrimaryPanelAction).toHaveBeenNthCalledWith(1, {
      type: "trigger",
      panel: "start",
    });
    expect(fixture.executePrimaryPanelAction).toHaveBeenNthCalledWith(2, {
      type: "trigger",
      panel: "search",
    });
    expect(fixture.executePrimaryPanelAction).toHaveBeenCalledTimes(2);
    expect(fixture.executeRootAction).not.toHaveBeenCalled();
  });

  it("active mobile application도 같은 intent를 Window Operation에 한 번 전달한다", () => {
    const fixture = createRuntimeFixture("mobile", "chrome");
    let controller: ReturnType<typeof useTaskbarRootController> | undefined;

    /** mobile view와 public Action을 함께 관찰한다. */
    const Probe = () => {
      controller = useTaskbarRootController();
      return null;
    };

    render(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );
    if (controller === undefined || controller.viewModel.status !== "ready") {
      throw new Error("준비된 mobile Root controller가 필요합니다");
    }

    expect(controller.viewModel.snapshot.mobileView[1]).toMatchObject({
      applicationId: "chrome",
      active: true,
    });
    act(() => controller?.actions.launchMobileApplication("chrome"));

    expect(fixture.executeWindowAction).toHaveBeenCalledExactlyOnceWith({
      type: "launch-mobile-application",
      applicationId: "chrome",
    });
  });

  it("SSR은 브라우저 Window snapshot을 읽지 않고 준비 전 표현을 사용한다", () => {
    const fixture = createRuntimeFixture("desktop");
    const statuses: string[] = [];

    /** server render가 관찰한 Root controller 준비 상태를 기록한다. */
    const Probe = () => {
      statuses.push(useTaskbarRootController().viewModel.status);
      return null;
    };

    renderToString(
      createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
    );

    expect(statuses).toEqual(["not-ready"]);
    expect(fixture.getSnapshot).not.toHaveBeenCalled();
    expect(fixture.getServerSnapshot).toHaveBeenCalledOnce();
    expect(fixture.listenerCount()).toBe(0);
  });

  it("공통 mode 변경을 반영하고 StrictMode unmount에서 구독을 정리한다", () => {
    const fixture = createRuntimeFixture("desktop");
    const modes: Array<WindowMode | "not-ready"> = [];

    /** Root controller가 공개한 mode 변화를 외부 assertion에 기록한다. */
    const Probe = () => {
      const { viewModel } = useTaskbarRootController();
      modes.push(viewModel.status === "ready" ? viewModel.snapshot.mode : "not-ready");
      return null;
    };

    const mounted = render(
      createElement(
        StrictMode,
        null,
        createElement(HeadlessRuntimeProvider, { runtime: fixture.runtime }, createElement(Probe)),
      ),
    );

    expect(fixture.listenerCount()).toBe(1);
    expect(modes.at(-1)).toBe("desktop");

    act(() => fixture.setMode("mobile"));
    expect(modes.at(-1)).toBe("mobile");

    mounted.unmount();
    expect(fixture.listenerCount()).toBe(0);
  });
});
