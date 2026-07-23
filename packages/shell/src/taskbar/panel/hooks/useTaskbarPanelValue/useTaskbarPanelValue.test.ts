import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarPanelValue } from "./index";

const PANEL_TRANSITION_WATCHDOG_MS = 1000;

const openSettledPanel = (result: ReturnType<typeof renderPanelValue>["result"]) => {
  act(() => {
    result.current.contextValue.openPanel("start");
  });
  act(() => {
    result.current.contextValue.completePanelTransition("start", "opening");
  });
};

const renderPanelValue = () => renderHook(() => useTaskbarPanelValue());

afterEach(() => {
  vi.useRealTimers();
});

describe("useTaskbarPanelValue", () => {
  describe("portal layer", () => {
    it("layer ref에 연결된 DOM을 context에 제공하고 해제하면 비운다", () => {
      const { result } = renderPanelValue();
      const layerElement = document.createElement("div");

      act(() => {
        result.current.layerRef(layerElement);
      });
      expect(result.current.contextValue.layerElement).toBe(layerElement);

      act(() => {
        result.current.layerRef(null);
      });
      expect(result.current.contextValue.layerElement).toBeNull();
    });
  });

  describe("keyboard", () => {
    it("열린 panel이 있을 때 Escape를 누르면 해당 panel을 closing으로 전환한다", () => {
      const { result } = renderPanelValue();
      openSettledPanel(result);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(result.current.contextValue.activePanelId).toBeNull();
      expect(result.current.contextValue.panelStates).toEqual({ start: "closing" });
    });

    it("Escape가 아닌 keydown은 열린 panel을 유지한다", () => {
      const { result } = renderPanelValue();
      openSettledPanel(result);

      fireEvent.keyDown(document, { key: "Enter" });

      expect(result.current.contextValue.activePanelId).toBe("start");
      expect(result.current.contextValue.panelStates).toEqual({ start: "open" });
    });

    it("defaultPrevented된 Escape는 열린 panel을 유지한다", () => {
      const { result } = renderPanelValue();
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
      });
      openSettledPanel(result);
      event.preventDefault();

      fireEvent(document, event);

      expect(result.current.contextValue.activePanelId).toBe("start");
      expect(result.current.contextValue.panelStates).toEqual({ start: "open" });
    });
  });

  describe("transition watchdog", () => {
    it("transition 완료 신호가 없으면 1000ms 뒤 opening과 closing을 정리한다", () => {
      vi.useFakeTimers();
      const { result } = renderPanelValue();

      act(() => {
        result.current.contextValue.openPanel("start");
      });
      act(() => {
        vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS - 1);
      });
      expect(result.current.contextValue.panelStates).toEqual({ start: "opening" });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.contextValue.panelStates).toEqual({ start: "open" });

      act(() => {
        result.current.contextValue.closePanel();
      });
      act(() => {
        vi.advanceTimersByTime(PANEL_TRANSITION_WATCHDOG_MS);
      });
      expect(result.current.contextValue.panelStates).toEqual({});
    });

    it("일부 panel 완료 뒤에도 transition이 남으면 최초 watchdog 시작 시간을 유지한다", () => {
      vi.useFakeTimers();
      const { result } = renderPanelValue();

      openSettledPanel(result);
      act(() => {
        result.current.contextValue.openPanel("search");
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      act(() => {
        result.current.contextValue.completePanelTransition("start", "closing");
      });
      act(() => {
        vi.advanceTimersByTime(399);
      });
      expect(result.current.contextValue.panelStates).toEqual({ search: "opening" });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.contextValue.panelStates).toEqual({ search: "open" });
    });

    it("모든 transition이 정상 완료되면 실행 중인 watchdog을 정리한다", () => {
      vi.useFakeTimers();
      const { result } = renderPanelValue();

      act(() => {
        result.current.contextValue.openPanel("start");
      });
      expect(vi.getTimerCount()).toBe(1);

      act(() => {
        result.current.contextValue.completePanelTransition("start", "opening");
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("unmount되면 실행 중인 watchdog을 정리한다", () => {
      vi.useFakeTimers();
      const { result, unmount } = renderPanelValue();

      act(() => {
        result.current.contextValue.openPanel("start");
      });
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
