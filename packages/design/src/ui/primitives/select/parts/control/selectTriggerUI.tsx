"use client";

import { forwardRef } from "react";

import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { SelectUITriggerProps } from "../../selectUI.types";

/**
 * 입력 없는 선택지 surface를 여는 combobox 역할의 button part다. `Value`와 장식용 화살표를 담고 기본 type은 `button`이다.
 *
 * 선택 값을 직접 저장하거나 애플리케이션 동작과 경로 이동을 실행하지 않는다.
 */
export const SelectTriggerUI = forwardRef<HTMLButtonElement, SelectUITriggerProps>(
  function SelectTriggerUI({ children, className, type = "button", ...props }, ref) {
    return (
      <BaseSelect.Trigger
        {...props}
        className={clsx("wd-select-ui__trigger", className)}
        ref={ref}
        type={type}
      >
        {children}
        <span aria-hidden="true" className="wd-select-ui__trigger-icon">
          <ChevronDown16Regular aria-hidden="true" />
        </span>
      </BaseSelect.Trigger>
    );
  },
);
