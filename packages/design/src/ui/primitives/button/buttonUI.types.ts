import type { ComponentPropsWithRef } from "react";

/**
 * ButtonUI가 제공하는 native button 동작과 ref를 정의한다.
 *
 * 이 타입은 button으로 실행할 비즈니스 동작을 정의하지 않는다.
 */
export type ButtonUIProps = Omit<ComponentPropsWithRef<"button">, "role" | "render"> & {
  /** 기본 native button 구성을 명시한다. 생략해도 같은 구성을 사용한다. */
  render?: "button";
};

/**
 * 탐색 작업을 단일 native anchor로 구성할 때 사용하는 프로젝트 소유 계약이다.
 *
 * `disabled`는 native anchor에 없는 상태를 `aria-disabled`, tab order와 activation 차단으로 일관되게 표현한다.
 */
export type ButtonUIAnchorProps = Omit<ComponentPropsWithRef<"a">, "role" | "render"> & {
  disabled?: boolean;
  render: "anchor";
};
