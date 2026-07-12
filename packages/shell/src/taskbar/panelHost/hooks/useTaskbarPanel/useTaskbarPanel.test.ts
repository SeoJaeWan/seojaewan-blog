import type { ReactNode } from "react";
import { createElement } from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarPanelHost } from "../..";
import type { TaskbarPanelPlacement } from "./index";
import { useTaskbarPanel } from "./index";

const createRect = ({
  height = 0,
  left = 0,
  top = 0,
  width = 0,
}: Partial<Pick<DOMRect, "height" | "left" | "top" | "width">> = {}): DOMRect => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  top,
  width,
  x: left,
  y: top,
  toJSON: () => ({}),
});

const HostWrapper = ({ children }: { children: ReactNode }) =>
  createElement(TaskbarPanelHost, null, children);

interface TaskbarPanelProbeProps {
  gap?: number;
  placement?: TaskbarPanelPlacement;
  viewportPadding?: number;
}

const TaskbarPanelProbe = ({
  gap,
  placement = "rootCenter",
  viewportPadding,
}: TaskbarPanelProbeProps) => {
  const panel = useTaskbarPanel({
    gap,
    panelId: "start",
    placement,
    viewportPadding,
  });

  return createElement(
    "div",
    null,
    createElement(
      "button",
      {
        "data-testid": "trigger",
        onClick: panel.toggle,
        ref: panel.triggerRef,
        type: "button",
      },
      "시작",
    ),
    createElement("output", { "data-testid": "open-state" }, String(panel.isOpen)),
    panel.renderPanel(createElement("div", { "data-testid": "panel" })),
  );
};

const mockElementRects = (rects: Record<string, DOMRect>) =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const rectKey = this.classList.contains("wb-taskbar-panel-container")
      ? "panel"
      : (this.dataset.testid ?? "");

    return rects[rectKey] ?? createRect();
  });

const getPanelContainer = () => {
  const container = screen.getByTestId("panel").parentElement;

  if (!(container instanceof HTMLDivElement)) {
    throw new Error("TaskbarPanelContainerUI를 찾을 수 없습니다.");
  }

  return container;
};

const mockViewport = (width: number, height: number) => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useTaskbarPanel", () => {
  it("TaskbarPanelHost 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPanel({ panelId: "start" }))).toThrow(
      "useTaskbarPanel은 TaskbarPanelHost 안에서 사용해야 합니다.",
    );
  });

  it("패널을 열고 교체하고 닫을 때 하나의 active panel만 유지한다", () => {
    const { result } = renderHook(
      () => ({
        search: useTaskbarPanel({ panelId: "search" }),
        start: useTaskbarPanel({ panelId: "start" }),
      }),
      { wrapper: HostWrapper },
    );

    expect(result.current.start.renderPanel(createElement("div"))).toBeNull();

    act(() => {
      result.current.start.open();
    });

    expect(result.current.start.isOpen).toBe(true);
    expect(result.current.search.isOpen).toBe(false);

    act(() => {
      result.current.search.open();
    });

    expect(result.current.start.isOpen).toBe(false);
    expect(result.current.search.isOpen).toBe(true);

    act(() => {
      result.current.start.close();
    });

    expect(result.current.search.isOpen).toBe(true);

    act(() => {
      result.current.search.toggle();
    });

    expect(result.current.search.isOpen).toBe(false);
  });

  it.each([
    { expectedLeft: 300, label: "왼쪽", placement: "left" },
    { expectedLeft: 120, label: "버튼 중심", placement: "center" },
    { expectedLeft: 400, label: "화면 중심", placement: "rootCenter" },
  ] as const)("$label 배치는 기준에 맞는 좌표를 계산한다", async ({ expectedLeft, placement }) => {
    mockViewport(1200, 800);
    mockElementRects({
      panel: createRect({ height: 600, width: 400 }),
      trigger: createRect({ height: 40, left: 300, top: 700, width: 40 }),
    });

    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe, { placement })));
    fireEvent.click(screen.getByTestId("trigger"));

    await waitFor(() => expect(getPanelContainer().style.visibility).toBe("visible"));

    expect(getPanelContainer().style.left).toBe(`${expectedLeft}px`);
    expect(getPanelContainer().style.bottom).toBe("108px");
  });

  it("위치가 화면 경계를 넘으면 viewport 안으로 보정한다", async () => {
    mockViewport(300, 800);
    mockElementRects({
      panel: createRect({ height: 600, width: 200 }),
      trigger: createRect({ height: 40, left: 280, top: 700, width: 40 }),
    });

    render(
      createElement(
        TaskbarPanelHost,
        null,
        createElement(TaskbarPanelProbe, { placement: "left", viewportPadding: 8 }),
      ),
    );
    fireEvent.click(screen.getByTestId("trigger"));

    await waitFor(() => expect(getPanelContainer().style.visibility).toBe("visible"));

    expect(getPanelContainer().style.left).toBe("92px");
  });

  it("viewport 크기가 바뀌면 열린 패널 위치를 다시 계산한다", async () => {
    let viewportWidth = 1200;

    vi.spyOn(window, "innerWidth", "get").mockImplementation(() => viewportWidth);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    mockElementRects({
      panel: createRect({ height: 600, width: 400 }),
      trigger: createRect({ height: 40, left: 300, top: 700, width: 40 }),
    });

    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)));
    fireEvent.click(screen.getByTestId("trigger"));

    await waitFor(() => expect(getPanelContainer().style.left).toBe("400px"));

    viewportWidth = 1000;
    fireEvent(window, new Event("resize"));

    await waitFor(() => expect(getPanelContainer().style.left).toBe("300px"));
  });

  it("trigger와 panel 내부 pointerdown은 유지하고 바깥 pointerdown은 닫는다", async () => {
    mockViewport(1200, 800);
    mockElementRects({
      panel: createRect({ height: 600, width: 400 }),
      trigger: createRect({ height: 40, left: 300, top: 700, width: 40 }),
    });

    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)));
    fireEvent.click(screen.getByTestId("trigger"));

    await waitFor(() => expect(screen.getByTestId("open-state").textContent).toBe("true"));

    fireEvent.pointerDown(screen.getByTestId("trigger"));
    fireEvent.pointerDown(screen.getByTestId("panel"));
    expect(screen.getByTestId("open-state").textContent).toBe("true");

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.getByTestId("open-state").textContent).toBe("false"));
    expect(screen.queryByTestId("panel")).toBeNull();
  });
});
