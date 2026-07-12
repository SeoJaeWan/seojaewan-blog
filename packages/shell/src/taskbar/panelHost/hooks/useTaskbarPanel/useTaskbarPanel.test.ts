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

const PANEL_TRANSITION_WATCHDOG_MS = 1000;

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

interface TaskbarPanelProbeProps {
  closeTestId?: string;
  gap?: number;
  openStateTestId?: string;
  panelId?: string;
  panelTestId?: string;
  placement?: TaskbarPanelPlacement;
  triggerTestId?: string;
  viewportPadding?: number;
}

const TaskbarPanelProbe = ({
  closeTestId = "close",
  gap,
  openStateTestId = "open-state",
  panelId = "start",
  panelTestId = "panel",
  placement = "rootCenter",
  triggerTestId = "trigger",
  viewportPadding,
}: TaskbarPanelProbeProps) => {
  const panel = useTaskbarPanel({
    gap,
    panelId,
    placement,
    viewportPadding,
  });

  return createElement(
    "div",
    null,
    createElement(
      "button",
      {
        "data-testid": triggerTestId,
        onClick: panel.toggle,
        ref: panel.triggerRef,
        type: "button",
      },
      panelId,
    ),
    createElement(
      "button",
      { "data-testid": closeTestId, onClick: panel.close, type: "button" },
      "닫기",
    ),
    createElement("output", { "data-testid": openStateTestId }, String(panel.isOpen)),
    panel.renderPanel(createElement("div", { "data-testid": panelTestId })),
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

const getPanelContainer = (panelTestId = "panel") => {
  const container = screen.getByTestId(panelTestId).parentElement;

  if (!(container instanceof HTMLDivElement)) {
    throw new Error("TaskbarPanelContainerUI를 찾을 수 없습니다.");
  }

  return container;
};

const mockViewport = (width: number, height: number) => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
};

const renderPanelPair = () =>
  render(
    createElement(
      TaskbarPanelHost,
      null,
      createElement(TaskbarPanelProbe, {
        closeTestId: "start-close",
        openStateTestId: "start-open-state",
        panelId: "start",
        panelTestId: "start-panel",
        triggerTestId: "start-trigger",
      }),
      createElement(TaskbarPanelProbe, {
        closeTestId: "search-close",
        openStateTestId: "search-open-state",
        panelId: "search",
        panelTestId: "search-panel",
        triggerTestId: "search-trigger",
      }),
    ),
  );

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useTaskbarPanel", () => {
  it("TaskbarPanelHost 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPanel({ panelId: "start" }))).toThrow(
      "useTaskbarPanel은 TaskbarPanelHost 안에서 사용해야 합니다.",
    );
  });

  it("패널을 열고 교체하고 닫을 때 하나의 active panel만 유지한다", () => {
    renderPanelPair();

    expect(screen.queryByTestId("start-panel")).toBeNull();

    fireEvent.click(screen.getByTestId("start-trigger"));

    expect(screen.getByTestId("start-open-state").textContent).toBe("true");
    expect(screen.getByTestId("search-open-state").textContent).toBe("false");
    fireEvent.animationEnd(getPanelContainer("start-panel"));

    fireEvent.click(screen.getByTestId("search-trigger"));

    expect(screen.getByTestId("start-open-state").textContent).toBe("false");
    expect(screen.getByTestId("search-open-state").textContent).toBe("true");
    fireEvent.animationEnd(getPanelContainer("start-panel"));
    fireEvent.animationEnd(getPanelContainer("search-panel"));

    fireEvent.click(screen.getByTestId("start-close"));

    expect(screen.getByTestId("search-open-state").textContent).toBe("true");

    fireEvent.click(screen.getByTestId("search-trigger"));

    expect(screen.getByTestId("search-open-state").textContent).toBe("false");
    fireEvent.animationEnd(getPanelContainer("search-panel"));
    expect(screen.queryByTestId("search-panel")).toBeNull();
  });

  it("교체 transition은 두 패널 animation이 끝날 때까지 추가 요청을 무시한다", () => {
    renderPanelPair();
    fireEvent.click(screen.getByTestId("start-trigger"));
    fireEvent.animationEnd(getPanelContainer("start-panel"));

    fireEvent.click(screen.getByTestId("search-trigger"));

    const closingContainer = getPanelContainer("start-panel");
    const openingContainer = getPanelContainer("search-panel");

    expect(closingContainer.dataset.state).toBe("closing");
    expect(closingContainer.getAttribute("aria-hidden")).toBe("true");
    expect(closingContainer.hasAttribute("inert")).toBe(true);
    expect(openingContainer.dataset.state).toBe("opening");
    expect(openingContainer.hasAttribute("inert")).toBe(true);

    fireEvent.animationEnd(closingContainer);
    fireEvent.click(screen.getByTestId("start-trigger"));

    expect(screen.queryByTestId("start-panel")).toBeNull();
    expect(screen.getByTestId("search-open-state").textContent).toBe("true");
    expect(getPanelContainer("search-panel").dataset.state).toBe("opening");

    fireEvent.animationEnd(getPanelContainer("search-panel"));
    fireEvent.click(screen.getByTestId("start-trigger"));

    expect(getPanelContainer("search-panel").dataset.state).toBe("closing");
    expect(getPanelContainer("start-panel").dataset.state).toBe("opening");
  });

  it("자식 animationend는 무시하고 Container root animationend만 완료 처리한다", () => {
    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)));
    fireEvent.click(screen.getByTestId("trigger"));

    fireEvent.animationEnd(screen.getByTestId("panel"));

    expect(getPanelContainer().dataset.state).toBe("opening");

    fireEvent.animationEnd(getPanelContainer());

    expect(getPanelContainer().dataset.state).toBe("open");
    expect(getPanelContainer().hasAttribute("inert")).toBe(false);
  });

  it("animationcancel은 현재 opening과 closing transition을 완료한다", () => {
    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)));
    fireEvent.click(screen.getByTestId("trigger"));

    fireEvent(getPanelContainer(), new Event("animationcancel", { bubbles: true }));

    expect(getPanelContainer().dataset.state).toBe("open");

    fireEvent.click(screen.getByTestId("trigger"));
    expect(getPanelContainer().dataset.state).toBe("closing");

    fireEvent(getPanelContainer(), new Event("animationcancel", { bubbles: true }));

    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("animation event가 없으면 1000ms watchdog이 패널 상태를 정리한다", () => {
    vi.useFakeTimers();
    render(createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)));
    fireEvent.click(screen.getByTestId("trigger"));

    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS - 1);
    });
    expect(getPanelContainer().dataset.state).toBe("opening");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getPanelContainer().dataset.state).toBe("open");

    fireEvent.click(screen.getByTestId("trigger"));
    act(() => {
      vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS);
    });

    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("교체 transition의 일부가 완료돼도 watchdog 시작 시간을 다시 계산하지 않는다", () => {
    vi.useFakeTimers();
    renderPanelPair();
    fireEvent.click(screen.getByTestId("start-trigger"));
    fireEvent.animationEnd(getPanelContainer("start-panel"));
    fireEvent.click(screen.getByTestId("search-trigger"));

    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.animationEnd(getPanelContainer("start-panel"));

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(getPanelContainer("search-panel").dataset.state).toBe("opening");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId("start-panel")).toBeNull();
    expect(getPanelContainer("search-panel").dataset.state).toBe("open");
  });

  it("Host가 unmount되면 실행 중인 watchdog을 정리한다", () => {
    vi.useFakeTimers();
    const { unmount } = render(
      createElement(TaskbarPanelHost, null, createElement(TaskbarPanelProbe)),
    );
    fireEvent.click(screen.getByTestId("trigger"));

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
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
    fireEvent.animationEnd(getPanelContainer());

    fireEvent.pointerDown(screen.getByTestId("trigger"));
    fireEvent.pointerDown(screen.getByTestId("panel"));
    expect(screen.getByTestId("open-state").textContent).toBe("true");

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.getByTestId("open-state").textContent).toBe("false"));
    fireEvent.animationEnd(getPanelContainer());
    expect(screen.queryByTestId("panel")).toBeNull();
  });
});
