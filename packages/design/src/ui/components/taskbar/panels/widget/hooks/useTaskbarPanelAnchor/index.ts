import { useCallback, useRef } from "react";

import type { TaskbarPanelWidgetVariant } from "../../index.js";
import { calculateTaskbarPanelAnchorRect } from "../../utils/calculateTaskbarPanelAnchorRect/index.js";

/**
 * Trigger ref와 Base UI virtual anchor를 제공한다.
 * Anchor 요청 시 DOM을 측정하고 좌표 정책은 순수 계산 함수에 위임한다.
 */
export const useTaskbarPanelAnchor = (variant: TaskbarPanelWidgetVariant) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  /**
   * 연결된 trigger가 없으면 null, 있으면 현재 측정값의 virtual anchor를 반환한다.
   */
  const resolveAnchor = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement === null) return null;
    const triggerBounds = triggerElement.getBoundingClientRect();
    const taskbarBounds = triggerElement
      .closest('.taskbar-root, nav[aria-label="작업 표시줄"]')
      ?.getBoundingClientRect();
    const rect = calculateTaskbarPanelAnchorRect({
      variant,
      viewportWidth: window.innerWidth,
      triggerBounds,
      taskbarTop: taskbarBounds?.top,
    });
    return { contextElement: triggerElement, getBoundingClientRect: () => DOMRect.fromRect(rect) };
  }, [variant]);
  return { triggerRef, resolveAnchor };
};
