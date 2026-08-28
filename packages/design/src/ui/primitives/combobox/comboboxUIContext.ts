"use client";

import { createContext } from "react";

import type { ComboboxUIProps } from "./comboboxUI.types";

interface ComboboxUIContextValue {
  inputId: string | undefined;
  items: readonly ComboboxUIProps["items"][number][];
}

/**
 * combobox family 내부에서 입력 식별자와 미리 정의된 선택지를 part 사이에 전달한다.
 *
 * family 공개 API나 애플리케이션 전역 상태 저장소로 사용하지 않는다.
 */
export const ComboboxUIContext = createContext<ComboboxUIContextValue>({
  inputId: undefined,
  items: [],
});
