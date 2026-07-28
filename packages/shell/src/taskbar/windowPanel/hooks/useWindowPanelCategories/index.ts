"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { WindowsPanelSection } from "@window/ui";

import { useWindowsItemsContext } from "../../../../windows/providers/windowsItemsProvider";
import { createWindowsPanelSections } from "../../utils/createWindowsPanelSections";

export interface UseWindowPanelCategoriesOptions {
  /** all browse 화면이 선택되어 category 상태를 유지해야 하는지 나타낸다. */
  allViewSelected: boolean;
}

export interface UseWindowPanelCategoriesResult {
  /** 모두 보기 category 목록의 scroll container ref. */
  allListRef: RefObject<HTMLDivElement | null>;
  /** category jump overlay의 열린 상태. */
  categoryOverlayOpen: boolean;
  /** category jump overlay의 열린 상태를 변경한다. */
  onCategoryOverlayOpenChange: (open: boolean) => void;
  /** 선택한 category 위치로 이동하고 overlay를 닫는다. */
  onCategorySelect: (category: string) => void;
  /** 전체 Windows item을 category별로 묶은 모두 보기 section. */
  sections: WindowsPanelSection[];
}

/**
 * Window panel 모두 보기의 category section, overlay와 scroll을 관리한다.
 * pinned 화면으로 전환하면 overlay를 닫고 search 화면에서는 all browse 상태를 보존한다.
 *
 * @param options.allViewSelected search 뒤에 보존된 browse 화면이 all인지 여부
 * @returns WindowsPanelUI.View에 연결할 category data, state와 callback
 */
export const useWindowPanelCategories = ({
  allViewSelected,
}: UseWindowPanelCategoriesOptions): UseWindowPanelCategoriesResult => {
  const windowsItems = useWindowsItemsContext();
  const allListRef = useRef<HTMLDivElement | null>(null);
  const [categoryOverlayOpen, setCategoryOverlayOpen] = useState(false);
  const sections = useMemo(() => createWindowsPanelSections(windowsItems), [windowsItems]);

  useEffect(() => {
    if (!allViewSelected) {
      setCategoryOverlayOpen(false);
    }
  }, [allViewSelected]);

  const onCategoryOverlayOpenChange = (open: boolean) => {
    setCategoryOverlayOpen(open);
  };

  const onCategorySelect = (category: string) => {
    setCategoryOverlayOpen(false);

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
  };

  return {
    allListRef,
    categoryOverlayOpen,
    onCategoryOverlayOpenChange,
    onCategorySelect,
    sections,
  };
};
