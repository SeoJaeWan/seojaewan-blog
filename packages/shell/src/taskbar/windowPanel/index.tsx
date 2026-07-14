"use client";

import { useMemo, useState } from "react";

import { WindowsPanelUI } from "@window/ui";

import { useWindowPinnedItems } from "../../windows/hooks/useWindowPinnedItems";
import { useWindowSearch } from "../../windows/hooks/useWindowSearch";
import { useSearchResultDetail } from "./hooks/useSearchResultDetail";
import { useTaskbarWindowPanelInteractions } from "./hooks/useTaskbarWindowPanelInteractions";
import { useWindowsPanelNavigation } from "./hooks/useWindowsPanelNavigation";
import { createWindowsPanelSections } from "./utils/createWindowsPanelSections";

export interface TaskbarWindowPanelProps {
  /** 시작 button의 aria-controls와 연결할 panel element ID. */
  id: string;
}

/**
 * Taskbar 시작 panel의 검색 input, 검색 결과와 pinned/all view를 조립한다.
 * query/navigation/detail은 panel 내부에서 관리하고 item/pin/event는 Windows hook으로 연결한다.
 *
 * @param props.id 시작 button aria-controls와 연결할 panel element ID
 * @returns compound WindowsPanelUI로 조립한 taskbar 시작 panel
 */
export const TaskbarWindowPanel = ({ id }: TaskbarWindowPanelProps) => {
  const [searchValue, setSearchValue] = useState("");
  const hasSearchQuery = searchValue.trim().length > 0;
  const results = useWindowSearch(searchValue);
  const pinnedItems = useWindowPinnedItems("windows");
  const sections = useMemo(() => createWindowsPanelSections(results), [results]);
  const navigation = useWindowsPanelNavigation();
  const searchDetail = useSearchResultDetail({ results, searchValue });
  const interactions = useTaskbarWindowPanelInteractions(searchDetail.detailItem);

  return (
    <WindowsPanelUI id={id}>
      <WindowsPanelUI.SearchInput
        onChange={(event) => setSearchValue(event.currentTarget.value)}
        value={searchValue}
      />
      {hasSearchQuery ? (
        <WindowsPanelUI.SearchResults
          detailActions={interactions.detailActions}
          detailItemId={searchDetail.detailItem?.id ?? null}
          onDetailAction={interactions.onDetailAction}
          onDetailItemChange={searchDetail.onDetailItemChange}
          onItemContextMenu={(event, item) => interactions.onItemContextMenu(event, item, "search")}
          onSelectItem={(item) => interactions.onOpenItem(item, "search")}
          results={results}
        />
      ) : (
        <WindowsPanelUI.View
          {...navigation}
          onItemContextMenu={interactions.onItemContextMenu}
          onPinnedItemAnimationEnd={pinnedItems.onPinnedItemAnimationEnd}
          onPinnedItemTransitionEnd={pinnedItems.onPinnedItemTransitionEnd}
          onSelectItem={interactions.onOpenItem}
          pinnedItemAnimation={pinnedItems.pinnedItemAnimation}
          pinnedItems={pinnedItems.pinnedItems}
          sections={sections}
        />
      )}
    </WindowsPanelUI>
  );
};
