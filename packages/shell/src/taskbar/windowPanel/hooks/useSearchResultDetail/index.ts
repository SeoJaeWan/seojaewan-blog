"use client";

import { useCallback, useEffect, useState } from "react";

import type { WindowItem } from "@window/ui";

export interface UseSearchResultDetailOptions {
  /** 현재 검색 결과 목록. */
  results: readonly WindowItem[];
  /** 현재 검색 input 값. 값이 바뀌면 상세 선택을 초기화한다. */
  searchValue: string;
}

export interface UseSearchResultDetailResult {
  /** 상세 pane에 표시할 현재 검색 결과 item. 선택이 없거나 결과에서 사라지면 null이다. */
  detailItem: WindowItem | null;
  /** 상세 pane에 표시할 검색 결과 item을 선택한다. */
  onDetailItemChange: (item: WindowItem) => void;
}

/**
 * Windows panel 검색 결과의 상세 item 선택을 관리한다.
 * 검색어가 바뀌거나 선택 item이 결과에서 사라지면 상세 선택을 초기화한다.
 *
 * @param options.results 현재 검색 결과 목록
 * @param options.searchValue 현재 검색 input 값
 * @returns 현재 results에서 찾은 상세 item과 선택 callback
 */
export const useSearchResultDetail = ({
  results,
  searchValue,
}: UseSearchResultDetailOptions): UseSearchResultDetailResult => {
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const detailItem = results.find((item) => item.id === detailItemId) ?? null;

  useEffect(() => {
    setDetailItemId(null);
  }, [searchValue]);

  useEffect(() => {
    setDetailItemId((currentItemId) => {
      if (currentItemId === null || results.some((item) => item.id === currentItemId)) {
        return currentItemId;
      }

      return null;
    });
  }, [results]);

  const onDetailItemChange = useCallback((item: WindowItem) => {
    setDetailItemId(item.id);
  }, []);

  return {
    detailItem,
    onDetailItemChange,
  };
};
