"use client";

import { useState } from "react";

import type { WindowsPanelViewMode } from "@window/ui";

export interface UseWindowPanelNavigationResult {
  /** 현재 표시할 pinned/all browse 화면. */
  browseView: WindowsPanelViewMode;
  /** pinned/all browse 화면을 변경한다. */
  onBrowseViewChange: (view: WindowsPanelViewMode) => void;
}

/**
 * Window panel의 pinned/all browse 화면 전환을 관리한다.
 * search 화면 routing은 이 상태와 검색 활성 여부를 조립하는 component가 소유한다.
 *
 * @returns 현재 browse 화면과 변경 callback
 */
export const useWindowPanelNavigation = (): UseWindowPanelNavigationResult => {
  const [browseView, setBrowseView] = useState<WindowsPanelViewMode>("pinned");

  const onBrowseViewChange = (view: WindowsPanelViewMode) => {
    setBrowseView(view);
  };

  return {
    browseView,
    onBrowseViewChange,
  };
};
