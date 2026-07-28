"use client";

import { useState } from "react";

import type { WindowsPanelViewMode } from "@window/ui";

export type WindowPanelView = WindowsPanelViewMode | "search";

export interface UseWindowPanelNavigationOptions {
  /** 유효한 검색어가 있어 search 화면을 표시해야 하는지 나타낸다. */
  searchActive: boolean;
}

export interface UseWindowPanelNavigationResult {
  /** 현재 실제로 표시할 pinned/all/search 화면. */
  activeView: WindowPanelView;
  /** search 화면 뒤에 보존할 pinned/all 화면. */
  browseView: WindowsPanelViewMode;
  /** pinned/all browse 화면을 변경한다. */
  onBrowseViewChange: (view: WindowsPanelViewMode) => void;
}

/**
 * Window panel의 pinned/all browse 화면과 search 화면 전환을 관리한다.
 * 검색 중에도 browse 화면을 보존하고 검색 종료 시 기존 화면으로 돌아간다.
 *
 * @param options.searchActive search 화면 활성 여부
 * @returns 현재 active view와 보존된 browse view
 */
export const useWindowPanelNavigation = ({
  searchActive,
}: UseWindowPanelNavigationOptions): UseWindowPanelNavigationResult => {
  const [browseView, setBrowseView] = useState<WindowsPanelViewMode>("pinned");
  const activeView: WindowPanelView = searchActive ? "search" : browseView;

  const onBrowseViewChange = (view: WindowsPanelViewMode) => {
    setBrowseView(view);
  };

  return {
    activeView,
    browseView,
    onBrowseViewChange,
  };
};
