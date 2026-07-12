"use client";

import type { CSSProperties, ReactNode, ReactPortal, RefObject } from "react";
import { createElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TaskbarPanelContainerUI } from "@window/ui";

import { TaskbarPanelHostContext } from "../..";

const DEFAULT_GAP = 8;
const DEFAULT_VIEWPORT_PADDING = 8;
const HIDDEN_POSITION_STYLE: CSSProperties = { visibility: "hidden" };

/** Taskbar panel의 가로 배치 기준. */
export type TaskbarPanelPlacement = "center" | "left" | "rootCenter";

export interface UseTaskbarPanelOptions {
  /** trigger와 panel 사이의 세로 간격. 기본값은 8px이다. */
  gap?: number;
  /** TaskbarPanelHost가 active panel을 식별할 고유 ID. */
  panelId: string;
  /** panel의 가로 배치 기준. 기본값은 trigger 왼쪽이다. */
  placement?: TaskbarPanelPlacement;
  /** panel을 viewport 안으로 보정할 때 적용할 최소 여백. 기본값은 8px이다. */
  viewportPadding?: number;
}

export interface UseTaskbarPanelResult {
  /** 현재 panel을 닫는다. 다른 active panel에는 영향을 주지 않는다. */
  close: () => void;
  /** 지정한 panelId가 현재 active panel인지 나타낸다. */
  isOpen: boolean;
  /** 현재 panel을 열고 기존 active panel을 교체한다. */
  open: () => void;
  /** presence phase 동안 panel visual을 Container와 Host layer portal로 조립한다. */
  renderPanel: (panel: ReactNode) => ReactPortal | null;
  /** 현재 panel의 열린 상태를 전환한다. */
  toggle: () => void;
  /** panel을 여는 taskbar button에 연결할 ref. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const resolvePanelLeft = (
  placement: TaskbarPanelPlacement,
  panelRect: DOMRect,
  triggerRect: DOMRect,
  viewportPadding: number,
) => {
  const viewportWidth = window.innerWidth;
  const effectivePadding =
    panelRect.width + viewportPadding * 2 <= viewportWidth ? viewportPadding : 0;
  const maximumLeft = Math.max(
    effectivePadding,
    viewportWidth - panelRect.width - effectivePadding,
  );

  let requestedLeft = triggerRect.left;

  if (placement === "center") {
    requestedLeft = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
  } else if (placement === "rootCenter") {
    requestedLeft = (viewportWidth - panelRect.width) / 2;
  }

  return clamp(requestedLeft, effectivePadding, maximumLeft);
};

/**
 * TaskbarPanelHost의 presence phase와 trigger/panel DOM 동작을 연결한다.
 * 위치 측정, Container animation 완료 전달, resize 재계산과 바깥 pointerdown 닫기를 담당한다.
 *
 * @param options.panelId TaskbarPanelHost가 panel을 식별할 고유 ID
 * @param options.placement panel의 가로 배치 기준. 기본값은 "left"
 * @param options.gap trigger와 panel 사이의 세로 간격. 기본값은 8px
 * @param options.viewportPadding viewport 경계 보정 여백. 기본값은 8px
 * @returns panel 상태 제어 함수, DOM ref, portal layer와 position style
 */
export const useTaskbarPanel = ({
  gap = DEFAULT_GAP,
  panelId,
  placement = "left",
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
}: UseTaskbarPanelOptions): UseTaskbarPanelResult => {
  const context = useContext(TaskbarPanelHostContext);

  if (context === null) {
    throw new Error("useTaskbarPanel은 TaskbarPanelHost 안에서 사용해야 합니다.");
  }

  const {
    activePanelId,
    closePanel,
    completePanelTransition,
    layerElement,
    openPanel,
    panelStates,
  } = context;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [positionStyle, setPositionStyle] = useState<CSSProperties>(HIDDEN_POSITION_STYLE);
  const panelState = panelStates[panelId] ?? null;
  const isPresent = panelState !== null;
  const isOpen = activePanelId === panelId;

  const calculatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const panelElement = panelRef.current;

    if (triggerElement === null || panelElement === null) {
      setPositionStyle(HIDDEN_POSITION_STYLE);
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const bottom = window.innerHeight - triggerRect.top + gap;
    const left = resolvePanelLeft(placement, panelRect, triggerRect, viewportPadding);

    setPositionStyle((currentStyle) => {
      if (
        currentStyle.bottom === bottom &&
        currentStyle.left === left &&
        currentStyle.visibility === "visible"
      ) {
        return currentStyle;
      }

      return { bottom, left, visibility: "visible" };
    });
  }, [gap, placement, viewportPadding]);

  const open = useCallback(() => {
    openPanel(panelId);
  }, [openPanel, panelId]);

  const close = useCallback(() => {
    closePanel(panelId);
  }, [closePanel, panelId]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
      return;
    }

    open();
  }, [close, isOpen, open]);

  const renderPanel = useCallback(
    (panel: ReactNode) => {
      if (panelState === null || layerElement === null) {
        return null;
      }

      return createPortal(
        createElement(
          TaskbarPanelContainerUI,
          {
            ref: panelRef,
            state: panelState,
            style: positionStyle,
          },
          panel,
        ),
        layerElement,
      );
    },
    [layerElement, panelState, positionStyle],
  );

  useEffect(() => {
    const panelElement = panelRef.current;

    if (panelElement === null || panelState === null || panelState === "open") {
      return;
    }

    const handlePanelAnimationComplete = (event: AnimationEvent) => {
      if (event.target !== panelElement) {
        return;
      }

      completePanelTransition(panelId, panelState);
    };

    panelElement.addEventListener("animationend", handlePanelAnimationComplete);
    panelElement.addEventListener("animationcancel", handlePanelAnimationComplete);

    return () => {
      panelElement.removeEventListener("animationend", handlePanelAnimationComplete);
      panelElement.removeEventListener("animationcancel", handlePanelAnimationComplete);
    };
  }, [completePanelTransition, panelId, panelState]);

  useEffect(() => {
    if (!isPresent) {
      setPositionStyle(HIDDEN_POSITION_STYLE);
      return;
    }

    calculatePosition();
    window.addEventListener("resize", calculatePosition);

    return () => {
      window.removeEventListener("resize", calculatePosition);
    };
  }, [calculatePosition, isPresent, layerElement]);

  useEffect(() => {
    if (panelState !== "open") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      closePanel(panelId);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closePanel, panelId, panelState]);

  return {
    close,
    isOpen,
    open,
    renderPanel,
    toggle,
    triggerRef,
  };
};
