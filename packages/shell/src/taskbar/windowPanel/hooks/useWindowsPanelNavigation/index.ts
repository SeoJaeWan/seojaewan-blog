"use client";

import type { RefObject } from "react";
import { useCallback, useRef, useState } from "react";

import type { WindowsPanelViewMode } from "@window/ui";

export interface UseWindowsPanelNavigationResult {
  /** 모두 보기 category 목록의 scroll container ref. */
  allListRef: RefObject<HTMLDivElement | null>;
  /** category jump overlay의 열린 상태. */
  categoryOverlayOpen: boolean;
  /** category jump overlay의 열린 상태를 변경한다. */
  onCategoryOverlayOpenChange: (open: boolean) => void;
  /** 모두 보기 목록을 선택한 category 위치로 이동한다. */
  onCategorySelect: (category: string) => void;
  /** pinned/all view를 변경하고 pinned 전환 시 category overlay를 닫는다. */
  onViewChange: (view: WindowsPanelViewMode) => void;
  /** 현재 표시할 pinned/all view. */
  view: WindowsPanelViewMode;
}

/**
 * Windows panel의 pinned/all view, category overlay와 category scroll을 관리한다.
 * panel close 상태는 소유하지 않으며 panel unmount 후 재생성될 때 초기 상태로 돌아간다.
 *
 * @returns WindowsPanelUI.View에 연결할 navigation 상태, callback과 목록 ref
 */
export const useWindowsPanelNavigation = (): UseWindowsPanelNavigationResult => {
  const allListRef = useRef<HTMLDivElement | null>(null);
  const [categoryOverlayOpen, setCategoryOverlayOpen] = useState(false);
  const [view, setView] = useState<WindowsPanelViewMode>("pinned");

  const onCategoryOverlayOpenChange = useCallback((open: boolean) => {
    setCategoryOverlayOpen(open);
  }, []);

  const onCategorySelect = useCallback((category: string) => {
    const listElement = allListRef.current;
    if (listElement === null) {
      return;
    }

    const categoryElement = [...listElement.querySelectorAll<HTMLElement>("[data-category]")].find(
      (element) => element.dataset.category === category,
    );
    if (!categoryElement) {
      return;
    }

    listElement.scrollTo({
      top: categoryElement.offsetTop - listElement.offsetTop,
    });
  }, []);

  const onViewChange = useCallback((nextView: WindowsPanelViewMode) => {
    setView(nextView);

    if (nextView === "pinned") {
      setCategoryOverlayOpen(false);
    }
  }, []);

  return {
    allListRef,
    categoryOverlayOpen,
    onCategoryOverlayOpenChange,
    onCategorySelect,
    onViewChange,
    view,
  };
};
