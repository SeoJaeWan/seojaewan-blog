import type { ComponentPropsWithRef } from "react";

import { Input } from "@base-ui/react/input";
import { clsx } from "clsx";

import "./taskbarSearch.css";

/**
 * 실제 검색 input의 native 속성과 제품 입력 callback이다.
 *
 * value와 onValueChange로 제어하거나 defaultValue로 독립적인 입력을 제공할 수 있다.
 */
export type TaskbarSearchProps = Omit<
  ComponentPropsWithRef<"input">,
  "children" | "dangerouslySetInnerHTML" | "type" | "value" | "defaultValue" | "onChange"
> &
  Readonly<{
    /** 외부 제품 상태가 제공하는 선택 표현이다. focus 자체와 별개다. */
    selected?: boolean;
    /** 제어 모드의 현재 검색어다. IME 조합과 공백을 그대로 보존한다. */
    value?: string;
    /** 비제어 모드의 초기 검색어다. */
    defaultValue?: string;
    /** 입력값 변경을 query 소유자에게 전달한다. */
    onValueChange?: (value: string) => void;
    /** pointer 또는 keyboard focus로 검색에 진입할 때 열기 요청을 전달한다. */
    onAction?: () => void;
  }>;

/**
 * Taskbar에서 직접 입력·수정·삭제할 수 있는 검색창을 렌더링한다.
 *
 * 실제 input의 focus와 입력 전달을 소유하며 검색 결과·recent·panel lifecycle은 구현하지 않는다.
 * 재클릭은 입력 focus를 유지하고 문자·공백 입력을 버튼 activation으로 처리하지 않는다.
 */
export const TaskbarSearch = ({
  className,
  disabled = false,
  onAction,
  onFocus,
  onValueChange,
  selected = false,
  ...props
}: TaskbarSearchProps) => (
  <span
    className="taskbar-search-surface"
    data-disabled={disabled ? "true" : undefined}
    data-selected={selected ? "true" : undefined}
  >
    <Input
      aria-label="검색"
      placeholder="검색"
      {...props}
      className={clsx("taskbar-search", className)}
      data-selected={selected ? "true" : undefined}
      disabled={disabled}
      onFocus={(event) => {
        onFocus?.(event);
        if (!disabled) onAction?.();
      }}
      onValueChange={(value) => onValueChange?.(value)}
      type="text"
    />
    <span aria-hidden="true" className="taskbar-search__icon" />
  </span>
);
