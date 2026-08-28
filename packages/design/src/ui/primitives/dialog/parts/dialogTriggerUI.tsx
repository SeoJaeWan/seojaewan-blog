"use client";

import type { Ref } from "react";
import { forwardRef, useContext } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUITriggerProps } from "../dialogUI.types";
import { DialogTriggerIdContext } from "./dialogTriggerIdContext";

/**
 * 자신이 속한 DialogRootUI의 modal content를 여는 visible button을 렌더링한다.
 *
 * DialogTriggerUI는 button이 나타내는 애플리케이션 동작의 의미를 결정하지 않는다.
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
