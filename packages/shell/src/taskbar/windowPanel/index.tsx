"use client";

import { WindowsPanelUI } from "@window/ui";

import { useTaskSearch } from "../search/hooks/useTaskSearch";
import { TaskSearchResultView } from "../search/resultView";
import { WindowPanelBrowseView } from "./browseView";
import { useWindowPanelNavigation } from "./hooks/useWindowPanelNavigation";

/**
 * Taskbar 시작 panel의 공통 검색 input과 pinned/all/search 화면 routing을 조립한다.
 * 검색 결과 action은 공용 TaskSearchResultView에, browse lifecycle은 WindowPanelBrowseView에 위임한다.
 */
export const TaskbarWindowPanel = () => {
  const search = useTaskSearch();
  const navigation = useWindowPanelNavigation();
  const activeView = search.isActive ? "search" : navigation.browseView;

  return (
    <WindowsPanelUI>
      <WindowsPanelUI.SearchInput
        onChange={(event) => search.onQueryChange(event.currentTarget.value)}
        value={search.query}
      />
      {activeView === "search" ? (
        <TaskSearchResultView className="wb-windows-panel__search-results" search={search} />
      ) : (
        <WindowPanelBrowseView
          onViewChange={navigation.onBrowseViewChange}
          view={navigation.browseView}
        />
      )}
    </WindowsPanelUI>
  );
};
