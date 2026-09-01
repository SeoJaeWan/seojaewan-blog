import { clsx } from "clsx";

import { TaskbarSearchUI } from "./taskbarSearchUI";
import type { SearchPanelUIProps } from "./taskbarUI.types";
import { TaskSearchRecommendationViewUI } from "./taskSearchRecommendationViewUI";
import { TaskSearchResultViewUI } from "./taskSearchResultViewUI";
import { WindowPanelUI } from "./windowPanelUI";

import "./taskbarUI.css";

/** Search recommendation/results/detail을 query 유무로 전환하는 complete production panel이다. */
export const SearchPanelUI = ({
  bestSections = [],
  className,
  detailActions = [],
  detailValue = null,
  onDetailAction,
  onDetailValueChange,
  onItemSelect,
  onSearchValueChange,
  recommendedItems = [],
  results = [],
  searchPlaceholder = "앱, 문서 및 설정 검색",
  searchValue = "",
  ...props
}: SearchPanelUIProps) => (
  <WindowPanelUI {...props} className={clsx("wd-search-panel-ui", className)}>
    <TaskbarSearchUI
      aria-label="작업 표시줄 검색"
      onChange={(event) => onSearchValueChange?.(event.currentTarget.value)}
      placeholder={searchPlaceholder}
      value={searchValue}
    />
    <div className="wd-search-panel-ui__body">
      {searchValue ? (
        <TaskSearchResultViewUI
          detailActions={detailActions}
          detailValue={detailValue}
          onDetailAction={onDetailAction}
          onDetailValueChange={onDetailValueChange}
          onItemSelect={onItemSelect}
          results={results}
        />
      ) : (
        <TaskSearchRecommendationViewUI
          bestSections={bestSections}
          onItemSelect={onItemSelect}
          recommendedItems={recommendedItems}
        />
      )}
    </div>
  </WindowPanelUI>
);
