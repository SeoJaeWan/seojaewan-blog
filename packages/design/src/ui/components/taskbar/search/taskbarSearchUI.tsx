import type { ComponentPropsWithRef } from "react";

import { Button } from "@base-ui/react/button";
import { clsx } from "clsx";

import "./taskbarSearchUI.css";

/** 검색 trigger의 고정 제품 의미를 제외한 native button 입력이다. */
export type TaskbarSearchUIProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "children" | "dangerouslySetInnerHTML" | "onClick" | "type"
> &
  Readonly<{
    /** panel 구현과 독립적으로 Search trigger의 선택 표현을 제어한다. */
    selected?: boolean;
    /** 실제 pointer·keyboard activation을 제품 Search Action으로 변환한다. */
    onAction?: () => void;
  }>;

/**
 * 검색 mask와 label을 가진 desktop Taskbar Search trigger를 렌더링한다.
 *
 * panel, query, recent와 focus 이동은 소유하지 않으며 `selected`는 현재 표현 입력으로만 사용한다.
 */
export const TaskbarSearchUI = ({
  className,
  onAction,
  selected = false,
  ...props
}: TaskbarSearchUIProps) => (
  <Button
    {...props}
    aria-label="검색 열기"
    className={clsx("taskbar-search", className)}
    data-selected={selected ? "true" : undefined}
    onClick={onAction}
    type="button"
  >
    <span aria-hidden="true" className="taskbar-search__icon" />
    <span className="taskbar-search__label">검색</span>
  </Button>
);
