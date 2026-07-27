"use client";

import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type TaskbarPanelRootContextValue,
} from "../../context";
import { resolveTaskbarPanelPosition } from "../../utils/resolveTaskbarPanelPosition";
import { useTaskbarPanelContext } from "../useTaskbarPanelContext";

const DEFAULT_GAP = 8;
const DEFAULT_VIEWPORT_PADDING = 8;
const HIDDEN_POSITION_STYLE: CSSProperties = { visibility: "hidden" };

/** Taskbar panel의 가로 배치 기준. */
export type TaskbarPanelPlacement = "center" | "left" | "rootCenter";

export interface UseTaskbarPanelRootValueOptions {
  /** trigger와 panel 사이의 세로 간격. 기본값은 8px이다. */
  gap?: number;
  /** 전역 panel 상태에서 이 Root를 식별할 ID. 생략하면 React ID를 사용한다. */
  panelId?: string;
  /** panel의 가로 배치 기준. 기본값은 trigger 왼쪽이다. */
  placement?: TaskbarPanelPlacement;
  /** panel을 viewport 안으로 보정할 때 적용할 최소 여백. 기본값은 8px이다. */
  viewportPadding?: number;
}

/**
 * 한 TaskbarPanel.Root를 전역 panel 상태에 연결하고 위치와 DOM lifecycle을 관리한다.
 *
 * @param options.panelId 전역 panel 상태에서 Root를 식별할 선택 ID
 * @param options.placement panel의 가로 배치 기준. 기본값은 "left"
 * @param options.gap trigger와 panel 사이의 세로 간격. 기본값은 8px
 * @param options.viewportPadding viewport 경계 보정 여백. 기본값은 8px
 * @returns Trigger와 Content가 공유할 Root context 값
 */
export const useTaskbarPanelRootValue = ({
  gap = DEFAULT_GAP,
  panelId,
  placement = "left",
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
}: UseTaskbarPanelRootValueOptions = {}): TaskbarPanelRootContextValue => {
  const generatedId = useId();
  const context = useTaskbarPanelContext();

  const resolvedPanelId = panelId ?? `taskbar-panel-${generatedId}`;
  const contentId = `taskbar-panel-content-${generatedId}`;
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
  const panelState = panelStates[resolvedPanelId] ?? null;
  const isPresent = panelState !== null;
  const isOpen = activePanelId === resolvedPanelId;

  const calculatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const panelElement = panelRef.current;

    if (triggerElement === null || panelElement === null) {
      setPositionStyle(HIDDEN_POSITION_STYLE);
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const { bottom, left } = resolveTaskbarPanelPosition({
      gap,
      panelRect,
      placement,
      triggerRect,
      viewportHeight: window.innerHeight,
      viewportPadding,
      viewportWidth: window.innerWidth,
    });

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

  const close = useCallback(() => {
    closePanel(resolvedPanelId);
  }, [closePanel, resolvedPanelId]);

  const open = useCallback(() => {
    openPanel(resolvedPanelId);
  }, [openPanel, resolvedPanelId]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [close, isOpen, open]);

  useEffect(() => {
    const panelElement = panelRef.current;

    if (panelElement === null || panelState === null || panelState === "open") {
      return;
    }

    const handlePanelAnimationComplete = (event: AnimationEvent) => {
      if (event.target !== panelElement) {
        return;
      }

      completePanelTransition(resolvedPanelId, panelState);
    };

    panelElement.addEventListener("animationend", handlePanelAnimationComplete);
    panelElement.addEventListener("animationcancel", handlePanelAnimationComplete);

    return () => {
      panelElement.removeEventListener("animationend", handlePanelAnimationComplete);
      panelElement.removeEventListener("animationcancel", handlePanelAnimationComplete);
    };
  }, [completePanelTransition, panelState, resolvedPanelId]);

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

      closePanel(resolvedPanelId);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closePanel, panelState, resolvedPanelId]);

  return useMemo(
    () => ({
      close,
      contentId,
      isOpen,
      layerElement,
      panelRef,
      panelState,
      positionStyle,
      toggle,
      triggerRef,
    }),
    [close, contentId, isOpen, layerElement, panelState, positionStyle, toggle],
  );
};
