"use client";

import { forwardRef } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ComboboxUIClearProps } from "../../comboboxUI.types";

/**
 * 현재 검색어와 선택 값을 지우는 button part다. 자식이 없으면 기본 지우기 기호를 표시하고 기본 type은 `button`이다.
 *
 * 루트에 전달된 선택지 배열을 변경하거나 애플리케이션 데이터를 삭제하지 않는다.
 */
export const ComboboxClearUI = forwardRef<HTMLButtonElement, ComboboxUIClearProps>(
  function ComboboxClearUI(
    { children = <Dismiss16Regular aria-hidden="true" />, className, type = "button", ...props },
    ref,
  ) {
    return (
      <BaseCombobox.Clear
        {...props}
        className={clsx("wd-combobox-ui__clear", className)}
        ref={ref}
        type={type}
      >
        {children}
      </BaseCombobox.Clear>
    );
  },
);
