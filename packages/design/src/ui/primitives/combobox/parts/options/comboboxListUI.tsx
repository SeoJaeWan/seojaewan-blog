"use client";

import { forwardRef, useContext } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type { ComboboxUIListProps } from "../../comboboxUI.types";
import { ComboboxUIContext } from "../../comboboxUIContext";
import { ComboboxItemUI } from "./comboboxItemUI";

/**
 * 필터 결과를 안정적인 값 key를 가진 option 목록으로 렌더링하는 listbox part다. `renderItem`이 있으면 각 선택지의 표시 내용만 위임한다.
 *
 * 검색 알고리즘, 선택지의 식별 값이나 현재 선택 상태를 독자적으로 변경하지 않는다.
 */
export const ComboboxListUI = forwardRef<HTMLDivElement, ComboboxUIListProps>(
  function ComboboxListUI({ className, renderItem, ...props }, ref) {
    const { items } = useContext(ComboboxUIContext);

    return (
      <BaseCombobox.List {...props} className={clsx("wd-combobox-ui__list", className)} ref={ref}>
        {(value: string) => {
          const option = items.find((item) => item.value === value);
          if (!option) return null;

          return (
            <ComboboxItemUI disabled={option.disabled} key={option.value} value={option.value}>
              {renderItem?.(option) ?? option.label}
            </ComboboxItemUI>
          );
        }}
      </BaseCombobox.List>
    );
  },
);
