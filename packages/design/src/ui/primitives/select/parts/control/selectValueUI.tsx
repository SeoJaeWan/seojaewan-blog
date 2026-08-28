"use client";

import { forwardRef } from "react";

import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";

import type { SelectUIValueProps } from "../../selectUI.types";

/**
 * 현재 선택된 미리 정의된 값의 label 또는 placeholder를 표시하는 value part다. trigger 안에서 루트의 선택 상태를 읽어 표현한다.
 *
 * 표시 문자열을 선택 값으로 역변환하거나 선택 상태와 애플리케이션 데이터를 변경하지 않는다.
 */
export const SelectValueUI = forwardRef<HTMLSpanElement, SelectUIValueProps>(function SelectValueUI(
  { className, ...props },
  ref,
) {
  return (
    <BaseSelect.Value {...props} className={clsx("wd-select-ui__value", className)} ref={ref} />
  );
});
