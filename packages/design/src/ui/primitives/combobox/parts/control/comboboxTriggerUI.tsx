"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { ChevronDown16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ComboboxUITriggerProps } from "../../comboboxUI.types";

/**
 * 미리 정의된 선택지 surface의 열림 상태를 전환하는 button part다. 자식이 없으면 기본 화살표를 표시하고 기본 type은 `button`이다.
 *
 * 애플리케이션 경로를 이동하거나 선택 값을 직접 확정하지 않는다.
 */
export function ComboboxTriggerUI({
  children = <ChevronDown16Regular aria-hidden="true" />,
  className,
  type = "button",
  ref,
  ...props
}: ComboboxUITriggerProps) {
  return (
    <BaseCombobox.Trigger
      {...props}
      className={clsx("wd-combobox-ui__trigger", className)}
      ref={ref}
      type={type}
    >
      {children}
    </BaseCombobox.Trigger>
  );
}
