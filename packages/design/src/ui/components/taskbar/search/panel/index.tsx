/**
 * @file Taskbar의 실제 Search input과 primary panel widget을 제품 연결에 조합한다.
 *
 * 기본 본문은 실제 Search 결과·recent·추천·detail이며 입력 조합과 탐색 DOM을 이 Surface가 관리한다.
 */
import type { KeyboardEvent, ReactNode } from "react";

import type { TaskbarPanelsConnection } from "../../panels/connection/index.js";
import { TaskbarPanelWidget } from "../../panels/widget/index.js";
import type { TaskbarStartResourceIconResolver } from "../../start/icon/index.js";
import { TaskbarSearchBody } from "../body/index.js";
import { useTaskbarSearchOwner } from "../hooks/useTaskbarSearchOwner/index.js";
import { TaskbarSearch, type TaskbarSearchProps } from "../input/index.js";
import { useTaskbarSearchInputFocus } from "./hooks/useTaskbarSearchInputFocus/index.js";

/** Search 제품 연결이 계산하는 controlled input props다. */
type ConnectedInputProp =
  "defaultValue" | "onAction" | "onValueChange" | "ref" | "selected" | "value";

/** 실제 Taskbar Search input과 panel 본문을 조합하는 public props다. */
export type TaskbarSearchPanelProps = Omit<TaskbarSearchProps, ConnectedInputProp> &
  Readonly<{
    /** Root에서 한 번 생성해 Search에 나눠 주는 primary panel 제품 연결이다. */
    connection: TaskbarPanelsConnection["search"];
    /** 기본 검색 본문을 선택적으로 교체하는 제품 조합 경계다. */
    children?: ReactNode;
    /** 두 Surface에 공통으로 표시할 Resource icon 표현이다. */
    resolveResourceIcon?: TaskbarStartResourceIconResolver;
    /** panel portal을 붙일 문서 내 container다. */
    portalContainer?: HTMLElement | null;
  }>;

/**
 * 실제 Search input의 Space는 문자 입력으로 유지하고 Base UI Trigger의 button 동작만 건너뛴다.
 *
 * native default와 IME event는 막지 않는다.
 */
const preserveSearchInputSpace = (event: KeyboardEvent<HTMLInputElement>): void => {
  if (event.key !== " ") return;
  (
    event as KeyboardEvent<HTMLInputElement> & Readonly<{ preventBaseUIHandler?: () => void }>
  ).preventBaseUIHandler?.();
};

/**
 * 작업 표시줄의 실제 input을 Search panel trigger로 유지하고 query와 lifecycle을 연결한다.
 *
 * panel 안에 두 번째 input을 만들지 않으며 Resource open 결과는 connection.resource를 사용하는
 * 상위 Search view가 전달한다.
 */
export const TaskbarSearchPanel = ({
  children,
  connection,
  onKeyDown,
  portalContainer,
  resolveResourceIcon,
  ...inputProps
}: TaskbarSearchPanelProps) => {
  const inputRef = useTaskbarSearchInputFocus(connection.widget.open);
  const owner = useTaskbarSearchOwner(connection);

  return (
    <TaskbarPanelWidget
      {...connection.widget}
      portalContainer={portalContainer}
      trigger={
        <TaskbarSearch
          {...inputProps}
          onCompositionStart={(event) => {
            inputProps.onCompositionStart?.(event);
            owner.inputProps.onCompositionStart();
          }}
          onCompositionEnd={(event) => {
            inputProps.onCompositionEnd?.(event);
            owner.inputProps.onCompositionEnd();
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) owner.inputProps.onKeyDown(event);
            if (!event.defaultPrevented) preserveSearchInputSpace(event);
          }}
          onValueChange={(value) => connection.actions.updateQuery(value)}
          ref={inputRef}
          selected={connection.widget.open}
          value={connection.query}
        />
      }
      variant="search"
    >
      {children ?? <TaskbarSearchBody owner={owner} resolveIcon={resolveResourceIcon} />}
    </TaskbarPanelWidget>
  );
};
