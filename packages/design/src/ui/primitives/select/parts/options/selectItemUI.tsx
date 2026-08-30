"use client";

import { forwardRef } from "react";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Checkmark16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { SelectUIItemProps } from "../../selectUI.types";

/**
 * 하나의 미리 정의된 값을 접근 가능한 option으로 표현하는 part다. 선택 표시와 소비자가 제공한 item text를 함께 렌더링한다.
 *
 * 루트에 없는 값을 생성하거나 선택 결과를 애플리케이션 저장소에 영속화하지 않는다.
 */
export const SelectItemUI = forwardRef<HTMLElement, SelectUIItemProps>(function SelectItemUI(
  { children, className, ...props },
  ref,
) {
  return (
    <BaseSelect.Item {...props} className={clsx("wd-select-ui__item", className)} ref={ref}>
      <BaseSelect.ItemIndicator className="wd-select-ui__item-indicator" keepMounted>
        <Checkmark16Regular aria-hidden="true" />
      </BaseSelect.ItemIndicator>
      <BaseSelect.ItemText className="wd-select-ui__item-label">{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
});
