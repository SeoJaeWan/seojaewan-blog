"use client";

import { WindowsPanelUI } from "@window/ui";

import { useTaskSearch } from "../search/hooks/useTaskSearch";
import { TaskSearchResultView } from "../search/resultView";
import { WindowPanelBrowseView } from "./browseView";
import { WindowPanelView } from "./view";

/**
 * Taskbar 시작 panel의 공통 검색 input과 pinned/all/search 화면 routing을 조립한다.
 * Pinned/All 선택은 WindowPanelView.Root가 검색 전환 바깥에서 보존한다.
 */
export const TaskbarWindowPanel = () => {
  const search = useTaskSearch();

  return (
    <WindowsPanelUI>
      <WindowsPanelUI.SearchInput
        onChange={(event) => search.onQueryChange(event.currentTarget.value)}
        value={search.query}
      />
      <WindowPanelView.Root>
        {search.isActive ? (
          <TaskSearchResultView className="wb-windows-panel__search-results" search={search} />
        ) : (
          <WindowPanelBrowseView />
        )}
      </WindowPanelView.Root>
    </WindowsPanelUI>
  );
};
