"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";

import type { ContextMenuTriggerHandler, UseContextMenuTriggerOptions } from "../../types";
import { useContextMenuContext } from "../useContextMenuContext";

/**
 * 한 surface의 target별 entry와 callback을 전역 Context Menu Host의 trigger handler로 변환한다.
 * 메뉴 상태, Portal과 browser lifecycle은 만들지 않는다.
 *
 * @param options surface가 소유하는 entry resolver와 action/open/close callback
 * @returns contextmenu event와 action target을 받는 안정적인 handler
 */
export const useContextMenuTrigger = <Target, ActionId extends string>(
  options: UseContextMenuTriggerOptions<Target, ActionId>,
): ContextMenuTriggerHandler<Target> => {
  const contextMenu = useContextMenuContext();
  const ownerId = useId();
  const optionsRef = useRef(options);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useEffect(
    () => () => {
      contextMenu.close("programmatic", {
        ownerId,
        restoreFocus: false,
      });
    },
    [contextMenu, ownerId],
  );

  return useCallback<ContextMenuTriggerHandler<Target>>(
    (event, target) => {
      event.preventDefault();

      const currentOptions = optionsRef.current;
      const triggerRect =
        event.clientX === 0 && event.clientY === 0
          ? event.currentTarget.getBoundingClientRect()
          : null;

      currentOptions.onOpen?.(target);
      contextMenu.open({
        anchorX: triggerRect?.left ?? event.clientX,
        anchorY: triggerRect?.bottom ?? event.clientY,
        animated: currentOptions.animated ?? true,
        getEntries: () => optionsRef.current.getEntries(target),
        onAction: (actionId) => optionsRef.current.onAction(actionId as ActionId, target),
        onClose: (reason) => optionsRef.current.onClose?.(target, reason),
        ownerId,
        triggerElement: event.currentTarget,
      });
    },
    [contextMenu, ownerId],
  );
};
