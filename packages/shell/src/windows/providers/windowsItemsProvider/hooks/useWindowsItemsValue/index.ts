"use client";

import { useEffect, useRef } from "react";

import type { WindowItem } from "@window/ui";

import { useWindowsEventsContext } from "../../../windowsEventsProvider";

/**
 * WindowItem 참조 생명주기를 관리하고 변경 완료 event를 전달한다.
 * @param windowsItems 앱이 source of truth로 제공한 현재 목록
 * @returns Provider Context에 전달할 동일한 목록 참조
 */
export const useWindowsItemsValue = (
  windowsItems: readonly WindowItem[],
): readonly WindowItem[] => {
  const { dispatch } = useWindowsEventsContext();
  const previousWindowsItemsRef = useRef(windowsItems);

  useEffect(() => {
    const previousItems = previousWindowsItemsRef.current;

    if (Object.is(previousItems, windowsItems)) {
      return;
    }

    previousWindowsItemsRef.current = windowsItems;
    dispatch("windowsItemsUpdated", { items: windowsItems, previousItems });
  }, [dispatch, windowsItems]);

  return windowsItems;
};
