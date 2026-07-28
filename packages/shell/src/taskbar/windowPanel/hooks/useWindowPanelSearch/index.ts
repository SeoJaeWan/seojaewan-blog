"use client";

import { useEffect, useState } from "react";

import type { WindowItem } from "@window/ui";

import { useWindowSearch } from "../../../../windows/hooks/useWindowSearch";

export interface UseWindowPanelSearchResult {
  /** 검색 결과의 현재 상세 item. */
  detailItem: WindowItem | null;
  /** 상세 pane에 표시할 현재 검색 결과 item ID. */
  detailItemId: string | null;
  /** 유효한 검색어가 있어 검색 결과 화면을 표시해야 하는지 나타낸다. */
  isActive: boolean;
  /** 현재 검색 input 값. */
  query: string;
  /** 현재 검색어에 해당하는 Windows item. */
  results: readonly WindowItem[];
  /** 검색 결과의 상세 item을 선택한다. */
  onDetailItemChange: (item: WindowItem) => void;
  /** 검색 input 값을 변경하고 기존 상세 선택을 초기화한다. */
  onQueryChange: (query: string) => void;
}

/**
 * Window panel의 검색어, 결과와 상세 선택을 관리한다.
 * 화면 navigation과 전체 item category section은 소유하지 않는다.
 *
 * @returns 검색 input과 결과 화면에 연결할 검색 상태와 callback
 */
export const useWindowPanelSearch = (): UseWindowPanelSearchResult => {
  const [query, setQuery] = useState("");
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const isActive = query.trim().length > 0;
  const results = useWindowSearch(query);
  const detailItem = results.find((item) => item.id === detailItemId) ?? null;

  useEffect(() => {
    if (detailItemId !== null && detailItem === null) {
      setDetailItemId(null);
    }
  }, [detailItem, detailItemId]);

  const onDetailItemChange = (item: WindowItem) => {
    setDetailItemId(item.id);
  };

  const onQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setDetailItemId(null);
  };

  return {
    detailItem,
    detailItemId,
    isActive,
    onDetailItemChange,
    onQueryChange,
    query,
    results,
  };
};
