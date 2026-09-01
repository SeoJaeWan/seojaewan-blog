"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type TaskbarWidgetCloseReason = "single-active";
type TaskbarWidgetClose = (reason: TaskbarWidgetCloseReason) => void;

interface TaskbarWidgetContextValue {
  activeWidgetId: string | null;
  activateWidget: (widgetId: string) => void;
  deactivateWidget: (widgetId: string) => void;
  layerElement: HTMLDivElement | null;
  registerWidget: (widgetId: string, close: TaskbarWidgetClose) => () => void;
}

const TaskbarWidgetContext = createContext<TaskbarWidgetContextValue | null>(null);

export const useTaskbarWidgetContext = () => useContext(TaskbarWidgetContext);

interface TaskbarWidgetProviderProps {
  children: ReactNode;
  layerElement: HTMLDivElement | null;
}

/** Taskbar family 안에서만 panel widget의 활성 상태와 portal layer를 공유한다. */
export const TaskbarWidgetProvider = ({ children, layerElement }: TaskbarWidgetProviderProps) => {
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const activeWidgetIdRef = useRef<string | null>(null);
  const widgetsRef = useRef(new Map<string, TaskbarWidgetClose>());

  const deactivateWidget = useCallback((widgetId: string) => {
    if (activeWidgetIdRef.current !== widgetId) return;

    activeWidgetIdRef.current = null;
    setActiveWidgetId(null);
  }, []);

  const activateWidget = useCallback((widgetId: string) => {
    const previousWidgetId = activeWidgetIdRef.current;

    if (previousWidgetId !== null && previousWidgetId !== widgetId) {
      widgetsRef.current.get(previousWidgetId)?.("single-active");
    }

    activeWidgetIdRef.current = widgetId;
    setActiveWidgetId(widgetId);
  }, []);

  const registerWidget = useCallback((widgetId: string, close: TaskbarWidgetClose) => {
    widgetsRef.current.set(widgetId, close);

    return () => {
      widgetsRef.current.delete(widgetId);
      if (activeWidgetIdRef.current === widgetId) {
        activeWidgetIdRef.current = null;
        setActiveWidgetId(null);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      activeWidgetId,
      activateWidget,
      deactivateWidget,
      layerElement,
      registerWidget,
    }),
    [activeWidgetId, activateWidget, deactivateWidget, layerElement, registerWidget],
  );

  return <TaskbarWidgetContext.Provider value={value}>{children}</TaskbarWidgetContext.Provider>;
};
