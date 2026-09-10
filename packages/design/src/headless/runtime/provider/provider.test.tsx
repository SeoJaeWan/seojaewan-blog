import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useStartController } from "../../start/controller/index.js";
import { useTaskbarController } from "../../taskbar/controller/index.js";
import { useWindowController } from "../../windows/controller/index.js";
import { useWorkspaceController } from "../../workspace/controller/index.js";
import type { ControllerViewModel, HeadlessFeatureRuntime, HeadlessRuntime } from "../index.js";
import { TransitionRegistry } from "../transitionRegistry/index.js";
import { HeadlessRuntimeProvider } from "./index.js";

type TestSnapshot = Readonly<{ revision: number }>;

/** Controller lifecycle test가 Store snapshot identity와 active listener 수를 제어하게 한다. */
const createFeature = () => {
  let snapshot: TestSnapshot = Object.freeze({ revision: 1 });
  let viewModel: ControllerViewModel<TestSnapshot> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const serverSnapshot: ControllerViewModel<TestSnapshot> = Object.freeze({
    status: "not-ready",
    snapshot: null,
  });
  const listeners = new Set<() => void>();
  const getSnapshot = vi.fn(() => viewModel);
  const getServerSnapshot = vi.fn(() => serverSnapshot);

  return {
    runtime: Object.freeze({
      getSnapshot,
      getServerSnapshot,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      execute: vi.fn(),
    }) as unknown as HeadlessFeatureRuntime<unknown, unknown, unknown>,
    getSnapshot,
    getServerSnapshot,
    listenerCount: () => listeners.size,
    /** 새 immutable snapshot을 반영하고 현재 구독자에게 commit을 알린다. */
    update() {
      snapshot = Object.freeze({ revision: snapshot.revision + 1 });
      viewModel = Object.freeze({ status: "ready", snapshot });
      for (const listener of listeners) listener();
    },
  };
};

/** 네 Foundation controller가 실제 Provider runtime을 함께 소비하도록 test runtime을 만든다. */
const createRuntimeFixture = () => {
  const windows = createFeature();
  const workspace = createFeature();
  const start = createFeature();
  const taskbar = createFeature();
  const primaryPanel = createFeature();
  const runtime = Object.freeze({
    windows: windows.runtime,
    workspace: workspace.runtime,
    start: start.runtime,
    taskbar: taskbar.runtime,
    primaryPanel: primaryPanel.runtime,
    transitions: new TransitionRegistry(),
  }) as HeadlessRuntime;
  return { runtime, windows, workspace, start, taskbar, primaryPanel };
};

afterEach(() => cleanup());

describe("HeadlessRuntimeProvider", () => {
  it("SSR은 사용자 Store를 읽거나 구독하지 않고 hydration용 준비 전 snapshot을 사용한다", () => {
    const fixture = createRuntimeFixture();
    const statuses: string[] = [];

    /** server renderer 안에서 네 controller의 공개 준비 상태만 기록한다. */
    const Probe = () => {
      statuses.push(
        useWindowController().viewModel.status,
        useWorkspaceController().viewModel.status,
        useStartController().viewModel.status,
        useTaskbarController().viewModel.status,
      );
      return null;
    };

    renderToString(
      createElement(
        HeadlessRuntimeProvider,
        { runtime: fixture.runtime },
        createElement(Probe),
      ),
    );

    expect(statuses).toEqual(["not-ready", "not-ready", "not-ready", "not-ready"]);
    expect(fixture.windows.getSnapshot).not.toHaveBeenCalled();
    expect(fixture.windows.getServerSnapshot).toHaveBeenCalled();
    expect(fixture.windows.listenerCount()).toBe(0);
  });

  it("StrictMode와 Provider 재마운트 뒤에도 Store 상태를 보존하고 구독을 누적하지 않는다", () => {
    const fixture = createRuntimeFixture();
    const observations: ReturnType<typeof useWindowController>[] = [];

    /** Window controller identity와 snapshot을 외부 assertion에 기록한다. */
    const Probe = () => {
      observations.push(useWindowController());
      useWorkspaceController();
      useStartController();
      useTaskbarController();
      return null;
    };
    const tree = createElement(
      StrictMode,
      null,
      createElement(
        HeadlessRuntimeProvider,
        { runtime: fixture.runtime },
        createElement(Probe),
      ),
    );
    const firstMount = render(tree);

    expect(fixture.windows.listenerCount()).toBe(1);
    expect(fixture.workspace.listenerCount()).toBe(1);
    const initialController = observations.at(-1)!;
    const initialActions = initialController.actions;

    act(() => fixture.windows.update());
    const updatedController = observations.at(-1)!;
    expect(updatedController.viewModel).toEqual({
      status: "ready",
      snapshot: { revision: 2 },
    });
    expect(updatedController.actions).toBe(initialActions);

    firstMount.unmount();
    expect(fixture.windows.listenerCount()).toBe(0);
    expect(fixture.workspace.listenerCount()).toBe(0);

    const secondMount = render(tree);
    expect(fixture.windows.listenerCount()).toBe(1);
    expect(observations.at(-1)?.viewModel).toEqual(updatedController.viewModel);
    secondMount.unmount();
    expect(fixture.windows.listenerCount()).toBe(0);
  });
});
