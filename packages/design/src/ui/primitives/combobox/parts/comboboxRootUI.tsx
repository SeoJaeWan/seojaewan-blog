"use client";

import { useId } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";

import type { ComboboxUIChangeDetails, ComboboxUIProps } from "../comboboxUI.types";
import { ComboboxUIContext } from "../comboboxUIContext";

const toChangeDetails = (reason: string): ComboboxUIChangeDetails => ({
  reason: reason as ComboboxUIChangeDetails["reason"],
});

/**
 * 미리 정의된 값의 검색어, 열림 상태와 단일 선택 상태를 조정하는 combobox 루트다. 하위 control과 options part에 입력 식별자와 선택지 목록을 제공한다.
 *
 * 자유 입력 값을 선택지로 추가하거나 애플리케이션 데이터 조회와 경로 이동을 수행하지 않는다.
 */
export function ComboboxRootUI({
  items,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  ...props
}: ComboboxUIProps) {
  const labels = new Map(items.map((item) => [item.value, item.label]));
  const inputId = useId();

  return (
    <ComboboxUIContext.Provider value={{ inputId, items }}>
      <BaseCombobox.Root
        {...props}
        itemToStringLabel={(value) => labels.get(value) ?? value}
        itemToStringValue={(value) => value}
        items={items.map((item) => item.value)}
        onInputValueChange={(value, details) =>
          onInputValueChange?.(value, toChangeDetails(details.reason))
        }
        onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
        onValueChange={(value, details) => onValueChange?.(value, toChangeDetails(details.reason))}
      />
    </ComboboxUIContext.Provider>
  );
}
