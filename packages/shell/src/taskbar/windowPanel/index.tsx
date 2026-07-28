"use client";

import { WindowsPanelUI } from "@window/ui";

import { WindowPanelBrowseView } from "./browseView";
import { useWindowPanelNavigation } from "./hooks/useWindowPanelNavigation";
import { useWindowPanelSearch } from "./hooks/useWindowPanelSearch";
import { WindowPanelSearchView } from "./searchView";

/**
 * Taskbar 시작 panel의 공통 검색 input과 pinned/all/search 화면 routing을 조립한다.
 * 화면별 Windows domain action과 visual lifecycle은 SearchView와 BrowseView에 위임한다.
 */
export const TaskbarWindowPanel = () => {
  const search = useWindowPanelSearch();
  const navigation = useWindowPanelNavigation({
    searchActive: search.isActive,
  });

  return (
    <WindowsPanelUI>
      <WindowsPanelUI.SearchInput
        onChange={(event) => search.onQueryChange(event.currentTarget.value)}
        value={search.query}
      />
      {navigation.activeView === "search" ? (
        <WindowPanelSearchView search={search} />
      ) : (
        <WindowPanelBrowseView
          onViewChange={navigation.onBrowseViewChange}
          view={navigation.browseView}
        />
      )}
    </WindowsPanelUI>
  );
};
