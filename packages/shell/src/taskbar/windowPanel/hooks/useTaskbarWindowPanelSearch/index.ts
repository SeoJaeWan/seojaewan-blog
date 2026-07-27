"use client";

import { useCallback, useMemo, useState } from "react";

import type { WindowItem, WindowsPanelSection } from "@window/ui";

import { useWindowSearch } from "../../../../windows/hooks/useWindowSearch";
import { createWindowsPanelSections } from "../../utils/createWindowsPanelSections";
import { useSearchResultDetail } from "../useSearchResultDetail";

export interface UseTaskbarWindowPanelSearchResult {
  /** 검색 결과의 현재 상세 item. */
  detailItem: WindowItem | null;
  /** 유효한 검색어가 있어 검색 결과 화면을 표시해야 하는지 나타낸다. */
  isSearchMode: boolean;
  /** 현재 검색어에 해당하는 Windows item. */
  results: readonly WindowItem[];
  /** 기본 화면의 모두 보기에 표시할 category section. */
  sections: WindowsPanelSection[];
  /** 검색 결과의 상세 item을 선택한다. */
  onDetailItemChange: (item: WindowItem) => void;
  /** 검색 input 값을 변경한다. */
  onSearchValueChange: (value: string) => void;
  /** 현재 검색 input 값. */
  searchValue: string;
}

/**
 * Taskbar Windows panel의 검색어, 화면 mode, 결과, section과 상세 선택을 관리한다.
 *
 * @returns 검색 input과 검색/기본 화면이 공유할 검색 흐름 값
 */
export const useTaskbarWindowPanelSearch = (): UseTaskbarWindowPanelSearchResult => {
  const [searchValue, setSearchValue] = useState("");
  const isSearchMode = searchValue.trim().length > 0;
  const results = useWindowSearch(searchValue);
  const sections = useMemo(() => createWindowsPanelSections(results), [results]);
  const { detailItem, onDetailItemChange } = useSearchResultDetail({
    results,
    searchValue,
  });

  const onSearchValueChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  return {
    detailItem,
    isSearchMode,
    onDetailItemChange,
    onSearchValueChange,
    results,
    searchValue,
    sections,
  };
};
