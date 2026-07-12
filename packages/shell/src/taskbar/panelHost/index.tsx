"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createPortal } from "react-dom";

import type { TaskbarPanelContainerState } from "@window/ui";
import { TaskbarPanelLayerUI } from "@window/ui";

import { useIsHydrated } from "../../hooks/useIsHydrated";
import type { TaskbarPanelTransitionState } from "./utils/panelHostReducer";
import {
  hasTransitioningPanel,
  INITIAL_HOST_STATE,
  taskbarPanelHostReducer,
} from "./utils/panelHostReducer";

export type { TaskbarPanelTransitionState } from "./utils/panelHostReducer";

const PANEL_TRANSITION_WATCHDOG_MS = 1000;

/** TaskbarPanelHost와 shell 내부 panel hook이 공유하는 상태 계약. */
export interface TaskbarPanelHostContextValue {
  /** 논리적으로 열린 taskbar panel ID. 닫힘을 요청하면 즉시 null이 된다. */
  activePanelId: string | null;
  /** 지정한 panel의 현재 phase와 일치하는 transition을 완료한다. */
  completePanelTransition: (panelId: string, state: TaskbarPanelTransitionState) => void;
  /** 지정한 panel이 활성 상태일 때 닫는다. ID를 생략하면 현재 panel을 닫는다. */
  closePanel: (panelId?: string) => void;
  /** TaskbarPanelContainerUI를 portal로 연결할 layer DOM. */
  layerElement: HTMLDivElement | null;
  /** 실제로 mounted 상태를 유지할 panel ID별 visual phase. */
  panelStates: Readonly<Record<string, TaskbarPanelContainerState>>;
  /** 지정한 panel을 활성화하고 기존 panel의 closing과 동시에 opening을 시작한다. */
  openPanel: (panelId: string) => void;
}

/** TaskbarPanelHost와 package 내부 hook을 연결하는 context. */
export const TaskbarPanelHostContext = createContext<TaskbarPanelHostContextValue | null>(null);

export interface TaskbarPanelHostProps {
  /** panel host 상태를 공유할 taskbar 기능 컴포넌트. */
  children: ReactNode;
  /** TaskbarPanelLayerUI를 연결할 portal 대상. 기본값은 hydration 이후 document.body이다. */
  portalContainer?: Element;
}


/**
 * Taskbar floating panel이 공유하는 활성 상태와 단일 visual layer를 제공한다.
 * panel presence, transition lock과 watchdog을 소유하고 DOM animation event 연결은 shell hook에 위임한다.
 *
 * @param props.children panel host 상태를 공유할 taskbar 기능 컴포넌트
 * @param props.portalContainer TaskbarPanelLayerUI를 연결할 portal 대상
 */
export const TaskbarPanelHost = ({ children, portalContainer }: TaskbarPanelHostProps) => {
  const [hostState, dispatch] = useReducer(taskbarPanelHostReducer, INITIAL_HOST_STATE);
  const [layerElement, setLayerElement] = useState<HTMLDivElement | null>(null);
  const isHydrated = useIsHydrated();
  const isTransitioning = hasTransitioningPanel(hostState.panelStates);

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

  const handleLayerElementChange = useCallback((element: HTMLDivElement | null) => {
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
    if (hostState.activePanelId === null) {
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
  }, [closePanel, hostState.activePanelId]);

  const contextValue = useMemo<TaskbarPanelHostContextValue>(
    () => ({
      activePanelId: hostState.activePanelId,
      closePanel,
      completePanelTransition,
      layerElement,
      openPanel,
      panelStates: hostState.panelStates,
    }),
    [closePanel, completePanelTransition, hostState, layerElement, openPanel],
  );

  const resolvedPortalContainer = portalContainer ?? (isHydrated ? document.body : null);

  return (
    <TaskbarPanelHostContext.Provider value={contextValue}>
      {children}
      {resolvedPortalContainer
        ? createPortal(
            <TaskbarPanelLayerUI ref={handleLayerElementChange} />,
            resolvedPortalContainer,
          )
        : null}
    </TaskbarPanelHostContext.Provider>
  );
};
