import type { ComponentPropsWithRef } from "react";

/**
 * InputUI가 제공하는 native 텍스트 입력 동작과 ref를 정의한다.
 *
 * 검증, 제출과 애플리케이션 검색 상태는 소비자가 소유한다.
 */
export type InputUIProps = Omit<ComponentPropsWithRef<"input">, "children">;
