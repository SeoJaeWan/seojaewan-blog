"use client";

import { useContext, useMemo } from "react";

import type { WindowItem } from "@window/ui";

import { WindowsStateContext } from "../..";
import { searchWindowItems } from "../../utils/searchWindowItems";

/** Windows가 제공하는 전체 항목을 query로 필터링한 derived 결과를 반환한다. */
export const useWindowSearch = (query: string): readonly WindowItem[] => {
  const state = useContext(WindowsStateContext);

  if (state === null) {
    throw new Error("useWindowSearch는 Windows 안에서 사용해야 합니다.");
  }

  return useMemo(
    () => searchWindowItems(state.windowsItems, query),
    [query, state.windowsItems],
  );
};
