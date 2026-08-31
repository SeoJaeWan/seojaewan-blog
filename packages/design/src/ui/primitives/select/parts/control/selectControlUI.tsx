"use client";

import { forwardRef } from "react";

import { clsx } from "clsx";

import type { SelectUIControlProps } from "../../selectUI.types";

/**
 * trigger와 조건부 clear를 하나의 시각적 control로 묶는 비상호작용 div part다. 전달된 div 속성과 ref를 실제 control 요소에 적용한다.
 *
 * 선택 값, 열림 상태나 자식 button의 native 상호작용을 직접 소유하거나 변경하지 않는다.
 */
export const SelectControlUI = forwardRef<HTMLDivElement, SelectUIControlProps>(
  function SelectControlUI({ className, ...props }, ref) {
    return <div {...props} className={clsx("wd-select-ui__control", className)} ref={ref} />;
  },
);
