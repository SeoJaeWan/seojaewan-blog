"use client";

import { useContext } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type { ComboboxUIInputProps } from "../../comboboxUI.types";
import { ComboboxUIContext } from "../../comboboxUIContext";

/**
 * 미리 정의된 선택지를 거르는 검색어를 받는 combobox 입력 part다. `Root`의 기본 식별자와 상태 계약에 연결된다.
 *
 * 임의 문자열을 새 선택 값으로 확정하거나 선택지 생성과 저장을 수행하지 않는다.
 */
export function ComboboxInputUI({ className, id, ref, ...props }: ComboboxUIInputProps) {
  const { inputId } = useContext(ComboboxUIContext);

  return (
    <BaseCombobox.Input
      {...props}
      className={clsx("wd-combobox-ui__input", className)}
      id={id ?? inputId}
      ref={ref}
    />
  );
}
