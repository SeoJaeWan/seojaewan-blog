"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type { ComboboxUIInputGroupProps } from "../../comboboxUI.types";

/**
 * 입력, trigger와 clear를 하나의 시각적 control로 묶는 배치 part다. 전달된 div 속성과 ref를 실제 그룹 요소에 적용한다.
 *
 * 검색어, 선택 값이나 열림 상태를 직접 소유하거나 변경하지 않는다.
 */
export function ComboboxInputGroupUI({ className, ref, ...props }: ComboboxUIInputGroupProps) {
  return (
    <BaseCombobox.InputGroup
      {...props}
      className={clsx("wd-combobox-ui__input-group", className)}
      ref={ref}
    />
  );
}
