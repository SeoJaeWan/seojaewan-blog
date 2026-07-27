"use client";

import type { MouseEventHandler, RefObject } from "react";
import { useCallback, useMemo } from "react";

import { useTaskbarPanelRootContext } from "../useTaskbarPanelRootContext";

/** TaskbarPanel.Trigger가 child button에 합성하는 기능 속성. */
export interface TaskbarPanelTriggerValue {
  "aria-controls": string;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-pressed": true | undefined;
  "data-selected": "true" | undefined;
  onClick: MouseEventHandler<HTMLElement>;
  ref: RefObject<HTMLButtonElement | null>;
}

/**
 * 현재 panel 상태에서 Trigger의 접근성 속성과 toggle event를 생성한다.
 *
 * @returns Trigger child에 합성할 접근성, event와 ref 계약
 */
export const useTaskbarPanelTriggerValue = (): TaskbarPanelTriggerValue => {
  const { contentId, isOpen, toggle, triggerRef } = useTaskbarPanelRootContext();

  const onClick = useCallback<MouseEventHandler<HTMLElement>>(
    (event) => {
      if (!event.defaultPrevented) {
        toggle();
      }
    },
    [toggle],
  );

  return useMemo(
    () => ({
      "aria-controls": contentId,
      "aria-expanded": isOpen,
      "aria-haspopup": "dialog" as const,
      "aria-pressed": isOpen || undefined,
      "data-selected": isOpen ? ("true" as const) : undefined,
      onClick,
      ref: triggerRef,
    }),
    [contentId, isOpen, onClick, triggerRef],
  );
};
