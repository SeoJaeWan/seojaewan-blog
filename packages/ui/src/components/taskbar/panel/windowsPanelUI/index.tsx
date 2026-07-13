import type { AnimationEvent, MouseEvent, Ref, TransitionEvent } from "react";

import { clsx } from "clsx";

import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionId, WindowItemActionState } from "../../../../types/windowItemAction";
import type { TaskPanelProps } from "../../../base/panel/taskPanel";
import { TaskPanel } from "../../../base/panel/taskPanel";
import type { TaskSearchInputProps } from "../../input/taskSearchInput";
import { TaskSearchInput } from "../../input/taskSearchInput";
import { TaskSearchResultView } from "../../view/taskSearchResultView";
import type {
  WindowsPanelPinnedItemAnimation,
  WindowsPanelSection,
  WindowsPanelViewMode,
} from "../../view/windowsPanelView";
import { WindowsPanelView } from "../../view/windowsPanelView";

/** contextmenu 이벤트가 발생한 WindowsPanelUI 목록 영역. */
export type WindowsPanelItemSource = WindowsPanelViewMode | "search";

/** WindowsPanelUI가 조합할 화면 상태와 외부 기능 계층에 위임할 interaction callback. */
export interface WindowsPanelUIProps extends Omit<TaskPanelProps, "children" | "role"> {
  /** 모두 보기의 scroll container를 외부 기능 계층에 전달할 ref. */
  allListRef?: Ref<HTMLDivElement>;
  /** category jump overlay의 열린 visual 상태. 기본값은 false이다. */
  categoryOverlayOpen?: boolean;
  /** 현재 검색 결과 상세 항목에 표시할 action 상태 목록. 기본값은 빈 배열이다. */
  detailActions?: readonly WindowItemActionState[];
  /** 검색 결과 상세 pane에 표시할 항목 id. null이면 상세 pane을 비운다. */
  detailItemId?: string | null;
  /** category overlay의 다음 open 상태를 기능 계층에 요청한다. */
  onCategoryOverlayOpenChange?: (open: boolean) => void;
  /** category jump 항목 선택을 기능 계층에 전달한다. */
  onCategorySelect?: (category: string) => void;
  /** 검색 결과 상세 pane action 클릭을 기능 계층에 전달한다. */
  onDetailAction?: (action: WindowItemActionId, item: WindowItem) => void;
  /** 검색 결과 상세 보기 버튼 클릭 시 선택한 item을 전달한다. */
  onDetailItemChange?: (item: WindowItem) => void;
  /** 항목 contextmenu 이벤트와 대상/source를 기능 계층에 전달한다. */
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => void;
  /** 고정 타일 fade-in animation 종료 이벤트를 기능 계층에 전달한다. */
  onPinnedItemAnimationEnd?: (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 고정 타일 축소 transition 종료 이벤트를 기능 계층에 전달한다. */
  onPinnedItemTransitionEnd?: (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 고정됨/모두/검색 결과 항목 클릭 시 선택 item을 전달한다. */
  onSelectItem?: (item: WindowItem) => void;
  /** pinned/all view 변경 요청을 기능 계층에 전달한다. */
  onViewChange?: (view: WindowsPanelViewMode) => void;
  /** 고정 타일 하나에 적용할 reorder visual 상태. null이면 animation class를 적용하지 않는다. */
  pinnedItemAnimation?: WindowsPanelPinnedItemAnimation | null;
  /** 고정됨 view에 표시할 항목 목록. 기본값은 빈 배열이다. */
  pinnedItems?: WindowItem[];
  /** 상단 검색 input에 전달할 visual/native input props. */
  searchInputProps?: TaskSearchInputProps;
  /** searchValue가 있을 때 보여줄 검색 결과. 기본값은 빈 배열이다. */
  searchResults?: WindowItem[];
  /** 검색어가 있으면 pinned/all 대신 검색 결과 visual을 보여준다. 기본값은 빈 문자열이다. */
  searchValue?: string;
  /** 모두 보기에서 category별로 표시할 section 목록. 기본값은 빈 배열이다. */
  sections?: WindowsPanelSection[];
  /** 현재 표시할 pinned/all visual. 기본값은 "pinned"이다. */
  view?: WindowsPanelViewMode;
}

/**
 * 작업 표시줄 시작 패널의 검색 input과 본문 view를 조합한다.
 * searchValue가 있으면 TaskSearchResultView를, 없으면 WindowsPanelView를 렌더링한다.
 * 패널의 접근성 role은 dialog로 고정하고 모든 항목 interaction은 callback으로 외부에 위임한다.
 *
 * @param props.view 현재 표시할 pinned/all visual. 기본값은 "pinned"
 * @param props.categoryOverlayOpen category jump overlay의 열린 visual 상태
 * @param props.pinnedItemAnimation 고정 타일에 적용할 reorder visual 상태
 * @param props.pinnedItems 고정됨 view에 표시할 항목
 * @param props.sections 모두 보기의 category별 항목
 * @param props.searchValue 검색 결과 visual 전환에 사용할 검색어
 * @param props.searchResults 검색 결과 visual에 표시할 항목
 * @param props.detailActions 현재 검색 결과 상세 항목에 표시할 action 상태 목록
 * @param props.detailItemId 검색 결과 상세 pane에 표시할 항목 id
 * @param props.searchInputProps 상단 TaskSearchInput에 전달할 props
 * @param props.allListRef 모두 보기 scroll container를 외부에 연결할 ref
 * @param props.onViewChange pinned/all view 변경 요청 callback
 * @param props.onCategoryOverlayOpenChange category overlay open 변경 요청 callback
 * @param props.onCategorySelect category jump 선택 callback
 * @param props.onSelectItem 고정됨/모두/검색 결과 항목 선택 callback
 * @param props.onItemContextMenu 항목 contextmenu 이벤트와 source를 전달하는 callback
 * @param props.onDetailItemChange 검색 결과 상세 항목 선택 callback
 * @param props.onDetailAction 검색 결과 상세 action 선택 callback
 * @param props.onPinnedItemTransitionEnd 고정 타일 transition 종료 callback
 * @param props.onPinnedItemAnimationEnd 고정 타일 animation 종료 callback
 * @param props.className panel root에 추가할 className
 */
export const WindowsPanelUI = ({
  allListRef,
  categoryOverlayOpen,
  className,
  detailActions = [],
  detailItemId = null,
  onCategoryOverlayOpenChange,
  onCategorySelect,
  onDetailAction,
  onDetailItemChange,
  onItemContextMenu,
  onPinnedItemAnimationEnd,
  onPinnedItemTransitionEnd,
  onSelectItem,
  onViewChange,
  pinnedItemAnimation,
  pinnedItems,
  searchInputProps,
  searchResults = [],
  searchValue = "",
  sections,
  view,
  ...props
}: WindowsPanelUIProps) => (
  <TaskPanel {...props} className={clsx("wb-windows-panel", className)} role="dialog">
    <div className="wb-windows-panel__search">
      <TaskSearchInput placeholder="앱 및 문서 검색" {...searchInputProps} />
    </div>
    {searchValue ? (
      <div className="wb-windows-panel__search-results">
        <TaskSearchResultView
          detailActions={detailActions}
          detailItemId={detailItemId}
          onDetailAction={onDetailAction}
          onDetailItemChange={onDetailItemChange}
          onItemContextMenu={
            onItemContextMenu
              ? (event, item) => onItemContextMenu(event, item, "search")
              : undefined
          }
          onSelectItem={onSelectItem}
          results={searchResults}
        />
      </div>
    ) : (
      <WindowsPanelView
        allListRef={allListRef}
        categoryOverlayOpen={categoryOverlayOpen}
        onCategoryOverlayOpenChange={onCategoryOverlayOpenChange}
        onCategorySelect={onCategorySelect}
        onItemContextMenu={onItemContextMenu}
        onPinnedItemAnimationEnd={onPinnedItemAnimationEnd}
        onPinnedItemTransitionEnd={onPinnedItemTransitionEnd}
        onSelectItem={onSelectItem}
        onViewChange={onViewChange}
        pinnedItemAnimation={pinnedItemAnimation}
        pinnedItems={pinnedItems}
        sections={sections}
        view={view}
      />
    )}
  </TaskPanel>
);
