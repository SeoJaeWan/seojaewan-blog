import type { ComponentPropsWithRef } from "react";

/**
 * ButtonUI가 제공하는 native button 동작과 ref를 정의한다.
 *
 * 이 타입은 button으로 실행할 비즈니스 동작을 정의하지 않는다.
 */
export type ButtonUIProps = Omit<ComponentPropsWithRef<"button">, "role">;
