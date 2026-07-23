import { describe, expect, it } from "vitest";

import type { TaskbarPanelState } from "./index";
import {
  hasTransitioningPanel,
  INITIAL_PANEL_STATE,
  taskbarPanelReducer,
} from "./index";

describe("taskbarPanelReducer", () => {
  describe("open", () => {
    it("transition이 진행 중이면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "search",
        panelStates: { search: "opening", start: "closing" },
      };

      const result = taskbarPanelReducer(state, { panelId: "start", type: "open" });

      expect(result).toBe(state);
    });

    it("현재 active panel과 요청한 panel이 같으면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { panelId: "start", type: "open" });

      expect(result).toBe(state);
    });

    it("active panel이 없으면 요청한 panel을 opening으로 추가한다", () => {
      const result = taskbarPanelReducer(INITIAL_PANEL_STATE, {
        panelId: "start",
        type: "open",
      });

      expect(result).toEqual({
        activePanelId: "start",
        panelStates: { start: "opening" },
      });
    });

    it("다른 active panel이 있으면 기존 panel은 closing, 요청한 panel은 opening으로 변경한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { panelId: "search", type: "open" });

      expect(result).toEqual({
        activePanelId: "search",
        panelStates: { search: "opening", start: "closing" },
      });
    });
  });

  describe("close", () => {
    it("transition이 진행 중이면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "search",
        panelStates: { search: "opening", start: "closing" },
      };

      const result = taskbarPanelReducer(state, { panelId: "search", type: "close" });

      expect(result).toBe(state);
    });

    it("요청한 panel이 active panel과 다르면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { panelId: "search", type: "close" });

      expect(result).toBe(state);
    });

    it("active panel이 없고 panel ID를 생략하면 기존 상태를 반환한다", () => {
      const result = taskbarPanelReducer(INITIAL_PANEL_STATE, {
        panelId: undefined,
        type: "close",
      });

      expect(result).toBe(INITIAL_PANEL_STATE);
    });

    it("panel ID를 생략하면 active panel을 closing으로 변경한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { panelId: undefined, type: "close" });

      expect(result).toEqual({
        activePanelId: null,
        panelStates: { start: "closing" },
      });
    });

    it("요청한 panel이 active panel이면 해당 panel을 closing으로 변경한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { panelId: "start", type: "close" });

      expect(result).toEqual({
        activePanelId: null,
        panelStates: { start: "closing" },
      });
    });
  });

  describe("completeTransition", () => {
    it("현재 phase와 완료 요청의 phase가 다르면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "opening" },
      };

      const result = taskbarPanelReducer(state, {
        panelId: "start",
        state: "closing",
        type: "completeTransition",
      });

      expect(result).toBe(state);
    });

    it("요청한 panel이 상태에 없으면 기존 상태를 반환한다", () => {
      const result = taskbarPanelReducer(INITIAL_PANEL_STATE, {
        panelId: "start",
        state: "opening",
        type: "completeTransition",
      });

      expect(result).toBe(INITIAL_PANEL_STATE);
    });

    it("opening 완료 요청이면 해당 panel을 open으로 변경한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "opening" },
      };

      const result = taskbarPanelReducer(state, {
        panelId: "start",
        state: "opening",
        type: "completeTransition",
      });

      expect(result).toEqual({
        activePanelId: "start",
        panelStates: { start: "open" },
      });
    });

    it("closing 완료 요청이면 해당 panel을 상태에서 제거한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "search",
        panelStates: { search: "opening", start: "closing" },
      };

      const result = taskbarPanelReducer(state, {
        panelId: "start",
        state: "closing",
        type: "completeTransition",
      });

      expect(result).toEqual({
        activePanelId: "search",
        panelStates: { search: "opening" },
      });
    });
  });

  describe("settleTransitions", () => {
    it("transition 중인 panel이 없으면 기존 상태를 반환한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "open" },
      };

      const result = taskbarPanelReducer(state, { type: "settleTransitions" });

      expect(result).toBe(state);
    });

    it("opening panel은 open으로 변경하고 closing panel은 제거한다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "search",
        panelStates: { search: "opening", start: "closing" },
      };

      const result = taskbarPanelReducer(state, { type: "settleTransitions" });

      expect(result).toEqual({
        activePanelId: "search",
        panelStates: { search: "open" },
      });
    });

    it("active panel이 정리된 상태에 없으면 active panel을 비운다", () => {
      const state: TaskbarPanelState = {
        activePanelId: "start",
        panelStates: { start: "closing" },
      };

      const result = taskbarPanelReducer(state, { type: "settleTransitions" });

      expect(result).toEqual({ activePanelId: null, panelStates: {} });
    });
  });
});

describe("hasTransitioningPanel", () => {
  it("panel이 없으면 false를 반환한다", () => {
    expect(hasTransitioningPanel({})).toBe(false);
  });

  it("모든 panel이 open이면 false를 반환한다", () => {
    expect(hasTransitioningPanel({ search: "open", start: "open" })).toBe(false);
  });

  it("opening panel이 있으면 true를 반환한다", () => {
    expect(hasTransitioningPanel({ search: "opening", start: "open" })).toBe(true);
  });

  it("closing panel이 있으면 true를 반환한다", () => {
    expect(hasTransitioningPanel({ search: "open", start: "closing" })).toBe(true);
  });
});
