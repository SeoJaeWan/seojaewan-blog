"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";

import type { SelectUIListProps } from "../../selectUI.types";

/**
 * 미리 정의된 item을 단일 선택 listbox로 묶는 options part다. 전달된 div 속성과 ref를 실제 목록 요소에 적용한다.
 *
 * 선택지 내용을 생성하거나 현재 선택 값과 열림 상태를 독자적으로 변경하지 않는다.
 */
export function SelectListUI({ className, ref, ...props }: SelectUIListProps) {
  return <BaseSelect.List {...props} className={clsx("wd-select-ui__list", className)} ref={ref} />;
}
