"use client";

import { useState } from "react";

import { Select as BaseSelect } from "@base-ui/react/select";

import type { SelectUIChangeDetails, SelectUIProps } from "../selectUI.types";
import { SelectUIContext } from "../selectUIContext";

const toChangeDetails = (reason: string): SelectUIChangeDetails => ({
  reason: reason as SelectUIChangeDetails["reason"],
});

/**
 * 입력 없는 단일 선택의 값과 열림 상태를 조정하는 select 루트다. 하위 control과 options part에 clear 가능 여부와 비활성 상태를 제공한다.
 *
 * 여러 태그를 편집하거나 선택지 데이터와 애플리케이션 업무 상태를 저장하지 않는다.
 */
export function SelectRootUI({
  defaultValue = null,
  disabled = false,
  items,
  onOpenChange,
  onValueChange,
  readOnly = false,
  value,
  ...props
}: SelectUIProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(defaultValue);
  const selectedValue = value === undefined ? uncontrolledValue : value;

  const changeValue = (nextValue: string | null, details: SelectUIChangeDetails) => {
    if (disabled || readOnly) return;
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue, details);
  };

  return (
    <SelectUIContext.Provider
      value={{
        clear: () => changeValue(null, { reason: "clear-press" }),
        disabled: disabled || readOnly,
        hasValue: selectedValue !== null,
      }}
    >
      <BaseSelect.Root
        {...props}
        disabled={disabled}
        itemToStringLabel={(itemValue) =>
          items.find((item) => item.value === itemValue)?.label ?? itemValue
        }
        itemToStringValue={(itemValue) => itemValue}
        items={Object.fromEntries(items.map((item) => [item.value, item.label]))}
        onOpenChange={(open, details) => onOpenChange?.(open, toChangeDetails(details.reason))}
        onValueChange={(nextValue, details) =>
          changeValue(nextValue, toChangeDetails(details.reason))
        }
        readOnly={readOnly}
        value={selectedValue}
      />
    </SelectUIContext.Provider>
  );
}
