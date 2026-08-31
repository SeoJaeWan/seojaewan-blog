"use client";

import { useId } from "react";

import { Popover } from "@base-ui/react/popover";

import { PopoverTriggerIdContext } from "../popoverTriggerIdContext";
import type { PopoverUIProps } from "../popoverUI.types";

/**
 * PopoverUI 조합의 최상위에서 Trigger와 Content에 제어 또는 비제어 방식의 비모달 열림 상태를 제공한다.
 *
 * PopoverRootUI는 기준 요소와 열림 상태만 조정하며 초점을 격리하거나 애플리케이션 상태와 탐색을 소유하지 않는다.
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
