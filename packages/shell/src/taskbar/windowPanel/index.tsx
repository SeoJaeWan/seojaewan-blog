"use client";

import { WindowsPanelUI } from "@window/ui";

import { useWindowPinAnimation } from "../../windows/providers/windowsPinsProvider";
import { useTaskbarWindowPanelInteractions } from "./hooks/useTaskbarWindowPanelInteractions";
import { useTaskbarWindowPanelSearch } from "./hooks/useTaskbarWindowPanelSearch";
import { useWindowsPanelNavigation } from "./hooks/useWindowsPanelNavigation";

/**
 * Taskbar 시작 panel의 검색 input, 검색 결과와 pinned/all view를 조립한다.
 * query/navigation/detail은 panel 내부에서 관리하고 item/pin/event는 Windows hook으로 연결한다.
 */
export const TaskbarWindowPanel = () => {
  const pinAnimation = useWindowPinAnimation();
  const navigation = useWindowsPanelNavigation();
  const search = useTaskbarWindowPanelSearch();
  const interactions = useTaskbarWindowPanelInteractions(search.detailItem);

  return (
    <WindowsPanelUI>
      <WindowsPanelUI.SearchInput
        onChange={(event) => search.onSearchValueChange(event.currentTarget.value)}
        value={search.searchValue}
      />
      {search.isSearchMode ? (
        <WindowsPanelUI.SearchResults
          detailActions={interactions.detailActions}
          detailItemId={search.detailItem?.id ?? null}
          onDetailAction={interactions.onDetailAction}
          onDetailItemChange={search.onDetailItemChange}
          onItemContextMenu={(event, item) => interactions.onItemContextMenu(event, item, "search")}
          onSelectItem={(item) => interactions.onOpenItem(item, "search")}
          results={search.results}
        />
      ) : (
        <WindowsPanelUI.View
          {...navigation}
          onItemContextMenu={interactions.onItemContextMenu}
          onPinnedItemAnimationEnd={pinAnimation.onPinnedItemAnimationEnd}
          onPinnedItemTransitionEnd={pinAnimation.onPinnedItemTransitionEnd}
          onSelectItem={interactions.onOpenItem}
          pinnedItemAnimation={pinAnimation.pinnedItemAnimation}
          pinnedItems={pinAnimation.pinnedItems}
          sections={search.sections}
        />
      )}
    </WindowsPanelUI>
  );
};
