"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type { ComboboxUIEmptyProps } from "../../comboboxUI.types";

/**
 * 현재 검색어와 일치하는 선택지가 없음을 알리는 options 상태 part다. 전달된 메시지와 div 속성을 빈 결과 영역에 적용한다.
 *
 * 검색어를 지우거나 선택지 목록을 추가, 조회 또는 변경하지 않는다.
 */
export function ComboboxEmptyUI({ className, ref, ...props }: ComboboxUIEmptyProps) {
  return (
    <BaseCombobox.Empty {...props} className={clsx("wd-combobox-ui__empty", className)} ref={ref} />
  );
}
