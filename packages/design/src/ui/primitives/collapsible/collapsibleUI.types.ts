import type { ComponentPropsWithRef } from "react";

/**
 * CollapsibleUI.Root의 controlled 또는 uncontrolled 펼침 상태와 native div prop을 정의한다.
 *
 * 이 타입은 folder 구성, tree 선택 또는 애플리케이션 비즈니스 상태를 정의하지 않는다.
 */
export interface CollapsibleUIProps extends ComponentPropsWithRef<"div"> {
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

/**
 * CollapsibleUI.Panel을 여닫는 native button prop과 ref를 정의한다.
 *
 * folder 선택과 tree 탐색 동작은 소비자가 소유한다.
 */
export type CollapsibleUITriggerProps = Omit<ComponentPropsWithRef<"button">, "role">;

/**
 * CollapsibleUI.Trigger가 펼치는 content container의 native div prop과 ref를 정의한다.
 *
 * folder 구성과 비즈니스 데이터는 소비자가 소유한다.
 */
export type CollapsibleUIPanelProps = ComponentPropsWithRef<"div">;
