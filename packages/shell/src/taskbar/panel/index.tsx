"use client";

import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

import { TaskbarPanelContainerUI, TaskbarPanelLayerUI } from "@window/ui";

import { Slot } from "@radix-ui/react-slot";

import { useIsHydrated } from "../../hooks/useIsHydrated";
import { TaskbarPanelContext, TaskbarPanelRootContext } from "./context";
import { useTaskbarPanelRootContext } from "./hooks/useTaskbarPanelRootContext";
import type {
  TaskbarPanelPlacement,
  UseTaskbarPanelRootValueOptions,
} from "./hooks/useTaskbarPanelRootValue";
import { useTaskbarPanelRootValue } from "./hooks/useTaskbarPanelRootValue";
import { useTaskbarPanelTriggerValue } from "./hooks/useTaskbarPanelTriggerValue";
import { useTaskbarPanelValue } from "./hooks/useTaskbarPanelValue";

export type { TaskbarPanelTransitionState } from "./utils/taskbarPanelReducer";

export interface TaskbarPanelProps {
  /** panel 상태를 공유할 taskbar 기능 컴포넌트. */
  children: ReactNode;
  /** TaskbarPanelLayerUI를 연결할 portal 대상. 기본값은 hydration 이후 document.body이다. */
  portalContainer?: Element;
}

export interface TaskbarPanelRootProps extends UseTaskbarPanelRootValueOptions {
  /** 같은 panel ID와 lifecycle을 공유할 Trigger와 Content. */
  children: ReactNode;
}

export interface TaskbarPanelTriggerProps {
  /** panel trigger 동작과 접근성 속성을 받을 단일 button 컴포넌트. */
  children: ReactElement;
}

export interface TaskbarPanelContentProps {
  /** visual container와 portal 안에 표시할 panel 콘텐츠. */
  children: ReactNode;
}

/**
 * Taskbar floating panel이 공유하는 활성 상태와 단일 visual layer를 제공한다.
 *
 * @param props.children panel 상태를 공유할 taskbar 기능 컴포넌트
 * @param props.portalContainer TaskbarPanelLayerUI를 연결할 portal 대상
 */
const TaskbarPanelProvider = ({ children, portalContainer }: TaskbarPanelProps) => {
  const { contextValue, layerRef } = useTaskbarPanelValue();
  const isHydrated = useIsHydrated();
  const resolvedPortalContainer = portalContainer ?? (isHydrated ? document.body : null);

  return (
    <TaskbarPanelContext.Provider value={contextValue}>
      {children}
      {resolvedPortalContainer
        ? createPortal(<TaskbarPanelLayerUI ref={layerRef} />, resolvedPortalContainer)
        : null}
    </TaskbarPanelContext.Provider>
  );
};

/**
 * 한 panel의 ID, trigger DOM, content DOM과 위치 lifecycle을 묶는다.
 *
 * @param props.panelId panel을 식별할 선택 ID. 생략하면 React ID를 사용한다
 * @param props.placement panel의 가로 배치 기준
 * @param props.gap trigger와 panel 사이의 세로 간격
 * @param props.viewportPadding viewport 경계 보정 여백
 * @param props.children 같은 panel에 속한 Trigger와 Content
 */
const TaskbarPanelRoot = ({
  children,
  gap,
  panelId,
  placement,
  viewportPadding,
}: TaskbarPanelRootProps) => {
  const value = useTaskbarPanelRootValue({ gap, panelId, placement, viewportPadding });

  return (
    <TaskbarPanelRootContext.Provider value={value}>
      {children}
    </TaskbarPanelRootContext.Provider>
  );
};

/**
 * 자식 button에 현재 panel의 toggle, ref와 접근성 속성을 합성한다.
 *
 * @param props.children trigger 계약을 받을 단일 button 컴포넌트
 */
const TaskbarPanelTrigger = ({ children }: TaskbarPanelTriggerProps) => {
  const triggerValue = useTaskbarPanelTriggerValue();

  return <Slot {...triggerValue}>{children}</Slot>;
};

/**
 * 현재 panel의 visual phase 동안 콘텐츠를 공용 layer에 portal로 렌더링한다.
 *
 * @param props.children panel visual
 */
const TaskbarPanelContent = ({ children }: TaskbarPanelContentProps) => {
  const context = useTaskbarPanelRootContext();

  if (context.panelState === null || context.layerElement === null) {
    return null;
  }

  return createPortal(
    <TaskbarPanelContainerUI
      id={context.contentId}
      ref={context.panelRef}
      state={context.panelState}
      style={context.positionStyle}
    >
      {children}
    </TaskbarPanelContainerUI>,
    context.layerElement,
  );
};

/**
 * Taskbar panel 전역 provider와 Root, Trigger, Content compound component.
 */
export const TaskbarPanel = Object.assign(TaskbarPanelProvider, {
  Content: TaskbarPanelContent,
  Root: TaskbarPanelRoot,
  Trigger: TaskbarPanelTrigger,
});

export type { TaskbarPanelPlacement };
