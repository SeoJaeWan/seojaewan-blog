"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Checkmark16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ComboboxUIItemProps } from "../../comboboxUI.types";

/**
 * 하나의 미리 정의된 값을 접근 가능한 option으로 표현하는 part다. 선택 표시와 소비자가 제공한 label 내용을 함께 렌더링한다.
 *
 * 루트에 없는 값을 생성하거나 선택 결과를 애플리케이션 저장소에 영속화하지 않는다.
 */
export function ComboboxItemUI({ children, className, ref, ...props }: ComboboxUIItemProps) {
  return (
    <BaseCombobox.Item {...props} className={clsx("wd-combobox-ui__item", className)} ref={ref}>
      <BaseCombobox.ItemIndicator className="wd-combobox-ui__item-indicator" keepMounted>
        <Checkmark16Regular aria-hidden="true" />
      </BaseCombobox.ItemIndicator>
      <span className="wd-combobox-ui__item-label">{children}</span>
    </BaseCombobox.Item>
  );
}
