"use client";

import { useContext } from "react";

import { Dismiss16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { SelectUIClearProps } from "../../selectUI.types";
import { SelectUIContext } from "../../selectUIContext";

/**
 * 현재 단일 선택을 `null`로 지우는 button part다. 값이 있을 때만 기본 지우기 기호를 렌더링하며 루트와 버튼이 비활성일 때 native disabled 상태를 제공한다.
 *
 * 미리 정의된 선택지를 제거하거나 여러 태그 및 애플리케이션 데이터를 삭제하지 않는다.
 */
export function SelectClearUI({
  children = <Dismiss16Regular aria-hidden="true" />,
  className,
  disabled,
  onClick,
  type = "button",
  ref,
  ...props
}: SelectUIClearProps) {
  const context = useContext(SelectUIContext);
  const actionDisabled = context.disabled || disabled;

  if (!context.hasValue) return null;

  return (
    <button
      {...props}
      className={clsx("wd-select-ui__clear", className)}
      disabled={actionDisabled}
      onClick={(event) => {
        if (actionDisabled) return;
        event.stopPropagation();
        context.clear();
        onClick?.(event);
      }}
      ref={ref}
      type={type}
    >
      {children}
    </button>
  );
}
