"use client";

import { createContext } from "react";

interface SelectUIContextValue {
  clear: () => void;
  disabled: boolean;
  hasValue: boolean;
}

/**
 * select family 내부에서 clear 동작과 현재 선택·비활성 상태를 part 사이에 전달한다.
 *
 * family 공개 API나 애플리케이션 전역 상태 저장소로 사용하지 않는다.
 */
export const SelectUIContext = createContext<SelectUIContextValue>({
  clear: () => undefined,
  disabled: false,
  hasValue: false,
});
