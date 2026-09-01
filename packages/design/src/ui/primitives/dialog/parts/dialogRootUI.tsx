"use client";

import { useId } from "react";

import { Dialog } from "@base-ui/react/dialog";

import { DialogTriggerIdContext } from "../dialogTriggerIdContext";
import type { DialogUIProps } from "../dialogUI.types";

/**
 * DialogUI 조합의 최상위에서 Trigger, Portal과 Content에 제어 또는 비제어 방식의 모달 열림 상태와 닫힘 정책을 제공한다.
 *
 * DialogRootUI는 모달 상태와 초점 격리만 조정하며 비즈니스 확인, 저장 또는 애플리케이션 탐색을 소유하지 않는다.
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
