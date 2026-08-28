"use client";

import { useId } from "react";

import { Dialog } from "@base-ui/react/dialog";

import type { DialogUIProps } from "../dialogUI.types";
import { DialogTriggerIdContext } from "./dialogTriggerIdContext";

/**
 * modal surface의 controlled 또는 uncontrolled 열림 상태와 dismissal 정책을 하위 part에 제공한다.
 *
 * DialogRootUI는 비즈니스 확인, 저장이나 애플리케이션 탐색을 소유하지 않는다.
 */
export const DialogRootUI = ({
  defaultOpen,
  disablePointerDismissal,
  onOpenChange,
  open,
  ...props
}: DialogUIProps) => {
  const triggerId = useId();

  return (
    <DialogTriggerIdContext.Provider value={triggerId}>
      <Dialog.Root
        {...props}
        defaultOpen={defaultOpen}
        defaultTriggerId={defaultOpen ? triggerId : undefined}
        disablePointerDismissal={disablePointerDismissal}
        modal
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
    </DialogTriggerIdContext.Provider>
  );
};
