"use client";

import { useId } from "react";

import { Popover } from "@base-ui/react/popover";

import type { PopoverUIProps } from "../popoverUI.types";
import { PopoverTriggerIdContext } from "./popoverTriggerIdContext";

/**
 * anchored non-modal surface의 controlled 또는 uncontrolled 열림 상태를 하위 part에 제공한다.
 *
 * PopoverRootUI는 focus를 격리하거나 애플리케이션 상태와 탐색을 소유하지 않는다.
 */
export const PopoverRootUI = ({ defaultOpen, onOpenChange, open, ...props }: PopoverUIProps) => {
  const triggerId = useId();

  return (
    <PopoverTriggerIdContext.Provider value={triggerId}>
      <Popover.Root
        {...props}
        defaultOpen={defaultOpen}
        defaultTriggerId={defaultOpen ? triggerId : undefined}
        modal={false}
        onOpenChange={
          onOpenChange
            ? (nextOpen, details) => {
                onOpenChange(nextOpen, { reason: details.reason });
              }
            : undefined
        }
        open={open}
        triggerId={open === undefined ? undefined : triggerId}
      />
    </PopoverTriggerIdContext.Provider>
  );
};
