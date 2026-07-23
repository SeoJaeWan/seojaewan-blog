"use client";

import type { RefCallback } from "react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type { TaskbarPanelContextValue } from "../../context";
import type { TaskbarPanelTransitionState } from "../../utils/taskbarPanelReducer";
import {
  hasTransitioningPanel,
  INITIAL_PANEL_STATE,
  taskbarPanelReducer,
} from "../../utils/taskbarPanelReducer";

const PANEL_TRANSITION_WATCHDOG_MS = 1000;

export interface UseTaskbarPanelValueResult {
  /** TaskbarPanelContext에 전달할 전역 panel 상태와 action. */
  contextValue: TaskbarPanelContextValue;
  /** portal layer DOM의 연결과 해제를 반영하는 ref callback. */
  layerRef: RefCallback<HTMLDivElement>;
}

/**
 * 모든 taskbar panel의 활성 상태, transition watchdog, Escape 닫기와 portal layer를 관리한다.
 *
 * @returns 전역 panel context 값과 layer ref callback
 */
export const useTaskbarPanelValue = (): UseTaskbarPanelValueResult => {
  const [panelState, dispatch] = useReducer(taskbarPanelReducer, INITIAL_PANEL_STATE);
  const [layerElement, setLayerElement] = useState<HTMLDivElement | null>(null);
  const isTransitioning = hasTransitioningPanel(panelState.panelStates);

  const openPanel = useCallback((panelId: string) => {
    dispatch({ panelId, type: "open" });
  }, []);

  const closePanel = useCallback((panelId?: string) => {
    dispatch({ panelId, type: "close" });
  }, []);

  const completePanelTransition = useCallback(
    (panelId: string, state: TaskbarPanelTransitionState) => {
      dispatch({ panelId, state, type: "completeTransition" });
    },
    [],
  );

  const layerRef = useCallback((element: HTMLDivElement | null) => {
    setLayerElement(element);
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      return;
    }

    const watchdogId = window.setTimeout(() => {
      dispatch({ type: "settleTransitions" });
    }, PANEL_TRANSITION_WATCHDOG_MS);

    return () => {
      window.clearTimeout(watchdogId);
    };
  }, [isTransitioning]);

  useEffect(() => {
    if (panelState.activePanelId === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        closePanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanel, panelState.activePanelId]);

  const contextValue = useMemo<TaskbarPanelContextValue>(
    () => ({
      activePanelId: panelState.activePanelId,
      closePanel,
      completePanelTransition,
      layerElement,
      openPanel,
      panelStates: panelState.panelStates,
    }),
    [closePanel, completePanelTransition, layerElement, openPanel, panelState],
  );

  return { contextValue, layerRef };
};
