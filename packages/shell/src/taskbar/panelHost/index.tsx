"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { TaskbarPanelLayerUI } from "@window/ui";

import { useIsHydrated } from "../../hooks/useIsHydrated";

/** TaskbarPanelHost와 shell 내부 panel hook이 공유하는 상태 계약. */
export interface TaskbarPanelHostContextValue {
  /** 현재 열린 taskbar panel ID. 열린 panel이 없으면 null이다. */
  activePanelId: string | null;
  /** 지정한 panel이 활성 상태일 때 닫는다. ID를 생략하면 현재 panel을 닫는다. */
  closePanel: (panelId?: string) => void;
  /** TaskbarPanelContainerUI를 portal로 연결할 layer DOM. */
  layerElement: HTMLDivElement | null;
  /** 지정한 panel을 활성화하고 기존 활성 panel을 교체한다. */
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
 * panel 위치와 콘텐츠 portal은 context를 소비하는 shell 내부 hook과 기능 컴포넌트가 담당한다.
 *
 * @param props.children panel host 상태를 공유할 taskbar 기능 컴포넌트
 * @param props.portalContainer TaskbarPanelLayerUI를 연결할 portal 대상
 */
export const TaskbarPanelHost = ({ children, portalContainer }: TaskbarPanelHostProps) => {
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [layerElement, setLayerElement] = useState<HTMLDivElement | null>(null);
  const isHydrated = useIsHydrated();

  const openPanel = useCallback((panelId: string) => {
    setActivePanelId(panelId);
  }, []);

  const closePanel = useCallback((panelId?: string) => {
    setActivePanelId((currentPanelId) => {
      if (panelId !== undefined && panelId !== currentPanelId) {
        return currentPanelId;
      }

      return null;
    });
  }, []);

  const handleLayerElementChange = useCallback((element: HTMLDivElement | null) => {
    setLayerElement(element);
  }, []);

  useEffect(() => {
    if (activePanelId === null) {
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
  }, [activePanelId, closePanel]);

  const contextValue = useMemo<TaskbarPanelHostContextValue>(
    () => ({ activePanelId, closePanel, layerElement, openPanel }),
    [activePanelId, closePanel, layerElement, openPanel],
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
