import type { ReactNode } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskbarPanelContextValue } from "../../context";
import { TaskbarPanelContext } from "../../context";
import type { TaskbarPanelPlacement } from "./index";
import { useTaskbarPanelRootValue } from "./index";

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

const createContextValue = (
  overrides: Partial<TaskbarPanelContextValue> = {},
): TaskbarPanelContextValue => ({
  activePanelId: null,
  closePanel: vi.fn(),
  completePanelTransition: vi.fn(),
  layerElement: document.createElement("div"),
  openPanel: vi.fn(),
  panelStates: {},
  ...overrides,
});

interface RootProbeProps {
  gap?: number;
  panelId?: string;
  placement?: TaskbarPanelPlacement;
  viewportPadding?: number;
}

const RootProbe = (props: RootProbeProps) => {
  const panel = useTaskbarPanelRootValue(props);

  return (
    <>
      <button data-testid="trigger" onClick={panel.toggle} ref={panel.triggerRef} type="button">
        열기
      </button>
      <button data-testid="close" onClick={panel.close} type="button">
        닫기
      </button>
      <output data-testid="open-state">{String(panel.isOpen)}</output>
      {panel.panelState === null ? null : (
        <div data-testid="panel-root" ref={panel.panelRef} style={panel.positionStyle}>
          <div data-testid="panel-child" />
        </div>
      )}
    </>
  );
};

const ContextWrapper = ({
  children,
  value,
}: {
  children: ReactNode;
  value: TaskbarPanelContextValue;
}) => <TaskbarPanelContext.Provider value={value}>{children}</TaskbarPanelContext.Provider>;

const renderProbe = (value: TaskbarPanelContextValue, props: RootProbeProps = {}) =>
  render(
    <ContextWrapper value={value}>
      <RootProbe panelId="start" {...props} />
    </ContextWrapper>,
  );

const mockElementRects = (rects: Record<string, DOMRect>) =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    return rects[this.dataset.testid ?? ""] ?? createRect();
  });

const mockViewport = (width: number, height: number) => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useTaskbarPanelRootValue", () => {
  describe("Root scope", () => {
    it("제공한 panel ID로 열기와 닫기를 전역 action에 전달한다", () => {
      const value = createContextValue();
      renderProbe(value);

      fireEvent.click(screen.getByTestId("trigger"));
      fireEvent.click(screen.getByTestId("close"));

      expect(value.openPanel).toHaveBeenCalledWith("start");
      expect(value.closePanel).toHaveBeenCalledWith("start");
    });

    it("panel ID를 생략하면 안정적인 자동 ID로 열기를 전달한다", () => {
      const value = createContextValue();
      const { rerender } = render(
        <ContextWrapper value={value}>
          <RootProbe />
        </ContextWrapper>,
      );

      fireEvent.click(screen.getByTestId("trigger"));
      const generatedPanelId = vi.mocked(value.openPanel).mock.calls[0]?.[0];

      rerender(
        <ContextWrapper value={value}>
          <RootProbe />
        </ContextWrapper>,
      );
      fireEvent.click(screen.getByTestId("trigger"));

      expect(generatedPanelId).toMatch(/^taskbar-panel-/);
      expect(value.openPanel).toHaveBeenLastCalledWith(generatedPanelId);
    });

    it("자신이 active panel이면 toggle로 닫기를 전달한다", () => {
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "open" },
      });
      renderProbe(value);

      fireEvent.click(screen.getByTestId("trigger"));

      expect(value.closePanel).toHaveBeenCalledWith("start");
      expect(value.openPanel).not.toHaveBeenCalled();
    });
  });

  describe("animation lifecycle", () => {
    it("panel 자식의 animationend는 transition 완료로 전달하지 않는다", () => {
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "opening" },
      });
      renderProbe(value);

      fireEvent.animationEnd(screen.getByTestId("panel-child"));

      expect(value.completePanelTransition).not.toHaveBeenCalled();
    });

    it("panel root의 animationend는 현재 transition 완료로 전달한다", () => {
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "opening" },
      });
      renderProbe(value);

      fireEvent.animationEnd(screen.getByTestId("panel-root"));

      expect(value.completePanelTransition).toHaveBeenCalledWith("start", "opening");
    });

    it.each(["opening", "closing"] as const)(
      "%s 중 panel root의 animationcancel은 현재 transition 완료로 전달한다",
      (panelState) => {
        const value = createContextValue({
          activePanelId: panelState === "opening" ? "start" : null,
          panelStates: { start: panelState },
        });
        renderProbe(value);

        fireEvent(screen.getByTestId("panel-root"), new Event("animationcancel"));

        expect(value.completePanelTransition).toHaveBeenCalledWith("start", panelState);
      },
    );
  });

  describe("placement", () => {
    it("측정한 trigger와 panel의 계산 좌표를 style에 연결한다", async () => {
      mockViewport(1200, 800);
      mockElementRects({
        "panel-root": createRect({ height: 600, width: 400 }),
        trigger: createRect({ height: 40, left: 300, top: 700, width: 40 }),
      });
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "open" },
      });

      renderProbe(value);

      await waitFor(() =>
        expect(screen.getByTestId("panel-root").style.visibility).toBe("visible"),
      );
      expect(screen.getByTestId("panel-root").style.left).toBe("300px");
      expect(screen.getByTestId("panel-root").style.bottom).toBe("108px");
    });

    it("viewport 크기가 바뀌면 열린 panel 위치를 다시 계산한다", async () => {
      let viewportWidth = 1200;

      vi.spyOn(window, "innerWidth", "get").mockImplementation(() => viewportWidth);
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
      mockElementRects({
        "panel-root": createRect({ height: 600, width: 400 }),
        trigger: createRect({ height: 40, left: 300, top: 700, width: 40 }),
      });
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "open" },
      });
      renderProbe(value, { placement: "rootCenter" });
      await waitFor(() => expect(screen.getByTestId("panel-root").style.left).toBe("400px"));

      viewportWidth = 1000;
      fireEvent(window, new Event("resize"));

      await waitFor(() => expect(screen.getByTestId("panel-root").style.left).toBe("300px"));
    });
  });

  describe("outside pointer", () => {
    it("trigger와 panel 내부 pointerdown은 유지하고 바깥 pointerdown만 닫는다", () => {
      const value = createContextValue({
        activePanelId: "start",
        panelStates: { start: "open" },
      });
      renderProbe(value);

      fireEvent.pointerDown(screen.getByTestId("trigger"));
      fireEvent.pointerDown(screen.getByTestId("panel-child"));
      expect(value.closePanel).not.toHaveBeenCalled();

      fireEvent.pointerDown(document.body);

      expect(value.closePanel).toHaveBeenCalledWith("start");
    });
  });
});
