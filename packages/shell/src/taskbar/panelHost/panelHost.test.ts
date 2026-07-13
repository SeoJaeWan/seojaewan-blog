import { createElement, useContext } from "react";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarPanelHost, TaskbarPanelHostContext } from "./index";

const PANEL_TRANSITION_WATCHDOG_MS = 1000;

const TaskbarPanelHostProbe = () => {
  const context = useContext(TaskbarPanelHostContext);

  if (context === null) {
    throw new Error("TaskbarPanelHostContext를 찾을 수 없습니다.");
  }

  return createElement(
    "div",
    null,
    createElement(
      "button",
      { "data-testid": "open-start", onClick: () => context.openPanel("start"), type: "button" },
      "start 열기",
    ),
    createElement(
      "button",
      {
        "data-testid": "open-search",
        onClick: () => context.openPanel("search"),
        type: "button",
      },
      "search 열기",
    ),
    createElement(
      "button",
      { "data-testid": "close", onClick: () => context.closePanel(), type: "button" },
      "닫기",
    ),
    createElement(
      "button",
      {
        "data-testid": "complete-start-opening",
        onClick: () => context.completePanelTransition("start", "opening"),
        type: "button",
      },
      "start opening 완료",
    ),
    createElement(
      "button",
      {
        "data-testid": "complete-start-closing",
        onClick: () => context.completePanelTransition("start", "closing"),
        type: "button",
      },
      "start closing 완료",
    ),
    createElement(
      "output",
      { "data-testid": "panel-states" },
      JSON.stringify(context.panelStates),
    ),
  );
};

const renderPanelHost = () =>
  render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelHostProbe)));

const expectPanelStates = (panelStates: Record<string, string>) => {
  expect(screen.getByTestId("panel-states").textContent).toBe(JSON.stringify(panelStates));
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TaskbarPanelHost", () => {
  it("transition이 완료되지 않으면 1000ms watchdog이 상태를 정리한다", () => {
    vi.useFakeTimers();
    renderPanelHost();
    fireEvent.click(screen.getByTestId("open-start"));

    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS - 1);
    });
    expectPanelStates({ start: "opening" });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expectPanelStates({ start: "open" });

    fireEvent.click(screen.getByTestId("close"));
    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS);
    });
    expectPanelStates({});
  });

  it("일부 transition 완료로 transitioning 상태가 유지되면 watchdog 시작 시간을 유지한다", () => {
    vi.useFakeTimers();
    renderPanelHost();
    fireEvent.click(screen.getByTestId("open-start"));
    fireEvent.click(screen.getByTestId("complete-start-opening"));
    fireEvent.click(screen.getByTestId("open-search"));

    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.click(screen.getByTestId("complete-start-closing"));

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expectPanelStates({ search: "opening" });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expectPanelStates({ search: "open" });
  });

  it("unmount되면 실행 중인 watchdog을 정리한다", () => {
    vi.useFakeTimers();
    const { unmount } = renderPanelHost();
    fireEvent.click(screen.getByTestId("open-start"));

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
