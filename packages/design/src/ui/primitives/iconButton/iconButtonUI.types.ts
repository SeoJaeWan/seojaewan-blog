import type { ReactNode } from "react";

import type { ButtonUIProps } from "../button";

/**
 * 아이콘 전용 button의 필수 접근 가능한 이름과 장식을 정의한다.
 *
 * 이 타입은 button으로 실행할 비즈니스 동작을 정의하지 않는다.
 */
export interface IconButtonUIProps extends Omit<
  ButtonUIProps,
  "aria-label" | "aria-labelledby" | "aria-pressed" | "children"
> {
  /** 원시 ARIA 이름 prop과 분리해 요구하는 접근 가능한 이름이다. */
  label: string;
  /** icon subtree 대신 label로 설명되는 장식 요소다. */
  icon: ReactNode;
  /** selected visual과 pressed 접근성 상태를 함께 켠다. */
  selected?: boolean;
  /** control과 icon geometry를 선택하며 기본값은 `md`다. */
  size?: "lg" | "md" | "sm";
}
