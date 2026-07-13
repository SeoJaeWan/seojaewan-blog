import type { MouseEvent } from "react";

import { clsx } from "clsx";

import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionId, WindowItemActionState } from "../../../../types/windowItemAction";
import type { TaskPanelProps } from "../../../base/panel/taskPanel";
import { TaskPanel } from "../../../base/panel/taskPanel";
import type { TaskSearchRecommendationSection } from "../../view/taskSearchRecommendationView";
import { TaskSearchRecommendationView } from "../../view/taskSearchRecommendationView";
import { TaskSearchResultView } from "../../view/taskSearchResultView";

export interface SearchPanelProps extends Omit<TaskPanelProps, "children" | "results"> {
  /** 검색어가 없을 때 추천 영역 아래에 표시할 best section 목록. 기본값은 빈 배열이다. */
  bestSections?: TaskSearchRecommendationSection[];
  /** 현재 검색 결과 상세 항목에 표시할 action 상태 목록. 기본값은 빈 배열이다. */
  detailActions?: readonly WindowItemActionState[];
  /** 검색 결과 상세 pane에 표시할 항목 id. null이면 상세 pane을 비운다. */
  detailItemId?: string | null;
  /** 결과 상세 pane의 열기/위치 열기/고정 action을 위임한다. */
  onDetailAction?: (action: WindowItemActionId, item: WindowItem) => void;
  /** 검색 결과의 상세 보기 버튼 클릭 시 선택한 item을 전달한다. */
  onDetailItemChange?: (item: WindowItem) => void;
  /** 추천/결과 항목의 contextmenu 이벤트와 대상 item을 기능 계층에 전달한다. */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 추천/결과 항목 클릭 시 선택 항목을 전달한다. */
  onSelectItem?: (item: WindowItem) => void;
  /** 검색어가 없을 때 상단 추천 목록에 표시할 항목. 기본값은 빈 배열이다. */
  recommendedItems?: WindowItem[];
  /** searchValue가 있을 때 결과 뷰에 전달할 항목. 기본값은 빈 배열이다. */
  results?: WindowItem[];
  /** 값이 있으면 검색 결과 뷰를, 없으면 추천/best 뷰를 렌더한다. 기본값은 빈 문자열이다. */
  searchValue?: string;
}

/**
 * taskbar 검색 floating panel (원본 SearchPanel).
 * 검색어가 없으면 추천/best section을 보여주고, 검색어가 있으면 TaskSearchResultView로 전환한다.
 * 상세 선택과 항목 동작은 controlled props와 callback으로 외부 기능 계층에 위임한다.
 *
 * @param props.searchValue 값이 있으면 결과 뷰를, 없으면 추천/best 뷰를 렌더한다
 * @param props.recommendedItems 검색 전 상단 추천 목록에 표시할 항목
 * @param props.bestSections 검색 전 추천 영역 아래에 표시할 section 목록
 * @param props.results 검색어가 있을 때 결과 뷰에 전달할 항목
 * @param props.detailActions 현재 검색 결과 상세 항목에 표시할 action 상태 목록
 * @param props.detailItemId 결과 상세 pane에 표시할 항목 id. 기본값은 null
 * @param props.onDetailItemChange 결과 상세 보기 선택을 외부 상태에 위임하는 callback
 * @param props.onSelectItem 추천/결과 항목 선택을 앱에 위임하는 callback
 * @param props.onDetailAction 결과 상세 pane action을 앱에 위임하는 callback
 * @param props.onItemContextMenu 추천/결과 항목의 contextmenu 이벤트를 기능 계층에 위임하는 callback
 */
export const SearchPanel = ({
  bestSections = [],
  className,
  detailActions = [],
  detailItemId = null,
  onDetailAction,
  onDetailItemChange,
  onItemContextMenu,
  onSelectItem,
  recommendedItems = [],
  results = [],
  searchValue = "",
  ...props
}: SearchPanelProps) => (
  <TaskPanel className={clsx("wb-search-panel", className)} {...props}>
    <div className="wb-search-panel__body">
      {searchValue ? (
        <TaskSearchResultView
          detailActions={detailActions}
          detailItemId={detailItemId}
          onDetailAction={onDetailAction}
          onDetailItemChange={onDetailItemChange}
          onItemContextMenu={onItemContextMenu}
          onSelectItem={onSelectItem}
          results={results}
        />
      ) : (
        <TaskSearchRecommendationView
          bestSections={bestSections}
          onItemContextMenu={onItemContextMenu}
          onSelectItem={onSelectItem}
          recommendedItems={recommendedItems}
        />
      )}
    </div>
  </TaskPanel>
);
