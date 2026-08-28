"use client";

import type { Ref } from "react";
import { forwardRef, useContext } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import { DialogTriggerIdContext } from "../dialogTriggerIdContext";
import type { DialogUITriggerProps } from "../dialogUI.types";

/**
 * DialogRootUI 안에서 Portal 밖에 놓여 모달 Content를 여는 화면에 보이는 button을 렌더링한다.
 *
 * DialogTriggerUI는 button의 접근 가능한 이름이나 열린 뒤 수행할 비즈니스 동작을 결정하지 않는다.
 */
export const DialogTriggerUI = forwardRef(function DialogTriggerUI(
  { className, id, type = "button", ...props }: DialogUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
  const triggerId = useContext(DialogTriggerIdContext);

  return (
    <Dialog.Trigger
      {...props}
      className={clsx("wd-dialog-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
});
