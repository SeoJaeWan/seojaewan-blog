"use client";

import { useState } from "react";

import { clsx } from "clsx";

import { TaskbarSearchUI } from "./taskbarSearchUI";
import type { WindowsPanelUIProps } from "./taskbarUI.types";
import { TaskSearchResultViewUI } from "./taskSearchResultViewUI";
import { WindowPanelUI } from "./windowPanelUI";
import { WindowsPanelAllViewUI } from "./windowsPanelAllViewUI";
import { WindowsPanelPinnedViewUI } from "./windowsPanelPinnedViewUI";

import "./taskbarUI.css";

/** Start search, Pinned/All navigation과 search results를 한 production Component로 조합한다. */
export const WindowsPanelUI = ({
  allSections = [],
  className,
  defaultView = "pinned",
  detailActions = [],
  detailValue = null,
  onDetailAction,
  onDetailValueChange,
  onItemSelect,
  onSearchValueChange,
  onViewChange,
  pinnedItems = [],
  results = [],
  searchValue,
  view,
  ...props
}: WindowsPanelUIProps) => {
  const [uncontrolledSearchValue, setUncontrolledSearchValue] = useState("");
  const [uncontrolledView, setUncontrolledView] = useState<"all" | "pinned">(defaultView);
  const resolvedSearchValue = searchValue ?? uncontrolledSearchValue;
  const resolvedView = view ?? uncontrolledView;

  const setView = (nextView: "all" | "pinned") => {
    if (view === undefined) setUncontrolledView(nextView);
    onViewChange?.(nextView);
  };

  const setSearchValue = (value: string) => {
    if (searchValue === undefined) setUncontrolledSearchValue(value);
    onSearchValueChange?.(value);
  };

  return (
    <WindowPanelUI {...props} className={clsx("wd-windows-panel-ui", className)}>
      <TaskbarSearchUI
        aria-label="시작 메뉴 검색"
        onChange={(event) => setSearchValue(event.currentTarget.value)}
        placeholder="앱 및 문서 검색"
        value={resolvedSearchValue}
      />
      {resolvedSearchValue ? (
        <div className="wd-windows-panel-ui__search-results">
          <TaskSearchResultViewUI
            detailActions={detailActions}
            detailValue={detailValue}
            onDetailAction={onDetailAction}
            onDetailValueChange={onDetailValueChange}
            onItemSelect={onItemSelect}
            results={results}
          />
        </div>
      ) : (
        <div className="wd-windows-panel-ui__views" data-view={resolvedView}>
          <WindowsPanelPinnedViewUI
            active={resolvedView === "pinned"}
            items={pinnedItems}
            onItemSelect={onItemSelect}
            onShowAll={() => setView("all")}
          />
          <WindowsPanelAllViewUI
            active={resolvedView === "all"}
            onItemSelect={onItemSelect}
            onShowPinned={() => setView("pinned")}
            sections={allSections}
          />
        </div>
      )}
    </WindowPanelUI>
  );
};
