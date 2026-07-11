import type { ComponentPropsWithoutRef, MouseEventHandler } from "react";

import { clsx } from "clsx";

import type { TaskSearchInputProps } from "../input/taskSearchInput";
import { TaskSearchInput } from "../input/taskSearchInput";

export interface TaskbarSearchProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** 내부 TaskSearchInput에 전달할 visual/native props. */
  inputProps?: TaskSearchInputProps;
  /** input 활성화와 trigger 숨김을 결정하는 visual 상태. 기본값은 false이다. */
  open?: boolean;
  /** 닫힌 검색 visual의 trigger 클릭을 외부 기능 계층에 전달한다. */
  onRequestOpen?: MouseEventHandler<HTMLButtonElement>;
  /** 닫힌 상태 trigger의 접근성 이름. 기본값은 "검색 열기"이다. */
  triggerLabel?: string;
}

/**
 * Taskbar 검색 input과 닫힌 상태 overlay trigger visual을 렌더링한다.
 * panel 상태, focus, 검색 값과 portal은 외부 shell connector가 props로 주입한다.
 *
 * @param props.open input 활성화와 trigger 숨김을 결정하는 visual 상태
 * @param props.onRequestOpen 닫힌 검색 trigger 클릭 callback
 * @param props.inputProps 내부 TaskSearchInput에 전달할 props
 * @param props.triggerLabel 닫힌 trigger의 접근성 이름. 기본값은 "검색 열기"
 * @param props.className search root에 추가할 className
 */
export const TaskbarSearch = ({
  className,
  inputProps,
  onRequestOpen,
  open = false,
  triggerLabel = "검색 열기",
  ...props
}: TaskbarSearchProps) => (
  <div
    className={clsx("wb-taskbar-search", className)}
    data-open={open ? "true" : undefined}
    {...props}
  >
    <button
      aria-label={triggerLabel}
      className="wb-taskbar-search__trigger"
      disabled={open}
      onClick={onRequestOpen}
      type="button"
    />
    <TaskSearchInput {...inputProps} disabled={!open} placeholder="검색" />
  </div>
);
