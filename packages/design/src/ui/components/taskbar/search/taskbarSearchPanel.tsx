/**
 * @file Taskbar의 실제 Search input과 primary panel widget을 제품 연결에 조합한다.
 *
 * 검색 결과, recent, detail과 Resource renderer는 children을 제공하는 상위 제품 view가 소유한다.
 */
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import type { TaskbarPanelsConnection } from "../panels/connection/index.js";
import { TaskbarPanelWidget } from "../panels/widget/taskbarPanelWidget.js";
import { TaskbarSearch, type TaskbarSearchProps } from "./taskbarSearch.js";

/** Search 제품 연결이 계산하는 controlled input props다. */
type ConnectedInputProp =
  "defaultValue" | "onAction" | "onValueChange" | "ref" | "selected" | "value";

/** 실제 Taskbar Search input과 panel 본문을 조합하는 public props다. */
export type TaskbarSearchPanelProps = Omit<TaskbarSearchProps, ConnectedInputProp> &
  Readonly<{
    /** Root에서 한 번 생성해 Search에 나눠 주는 primary panel 제품 연결이다. */
    connection: TaskbarPanelsConnection["search"];
    /** Search panel에 표시할 실제 제품 본문이다. */
    children: ReactNode;
    /** panel portal을 붙일 문서 내 container다. */
    portalContainer?: HTMLElement | null;
  }>;

/**
 * 작업 표시줄의 실제 input을 Search panel trigger로 유지하고 query와 lifecycle을 연결한다.
 *
 * panel 안에 두 번째 input을 만들지 않으며 Resource open 결과는 connection.resource를 사용하는
 * 상위 Search view가 전달한다.
 */
export const TaskbarSearchPanel = ({
  children,
  connection,
  portalContainer,
  ...inputProps
}: TaskbarSearchPanelProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);

  /** pointer 이외의 제품 요청으로 열린 경우에도 실제 Taskbar input에 focus한다. */
  useEffect(() => {
    if (connection.widget.open && !wasOpenRef.current) {
      inputRef.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = connection.widget.open;
  }, [connection.widget.open]);

  return (
    <TaskbarPanelWidget
      {...connection.widget}
      portalContainer={portalContainer}
      trigger={
        <TaskbarSearch
          {...inputProps}
          onValueChange={(value) => connection.actions.updateQuery(value)}
          ref={inputRef}
          selected={connection.widget.open}
          value={connection.query}
        />
      }
      variant="search"
    >
      {children}
    </TaskbarPanelWidget>
  );
};
