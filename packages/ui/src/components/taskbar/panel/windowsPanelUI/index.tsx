import type { AnimationEvent, MouseEvent, Ref, TransitionEvent } from "react";
import { Fragment } from "react";

import { ChevronLeft12Regular, ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionId, WindowItemActionState } from "../../../../types/windowItemAction";
import type { TaskPanelProps } from "../../../base/panel/taskPanel";
import { TaskPanel } from "../../../base/panel/taskPanel";
import { PanelIconButton } from "../../button/panelIconButton";
import type { TaskSearchInputProps } from "../../input/taskSearchInput";
import { TaskSearchInput } from "../../input/taskSearchInput";
import { TaskSearchResultView } from "../../view/taskSearchResultView";

/** WindowsPanel에서 표시할 시작 화면 고정됨/전체 목록 visual. */
export type WindowsPanelView = "all" | "pinned";

/** contextmenu 이벤트가 발생한 WindowsPanelUI 목록 영역. */
export type WindowsPanelItemSource = "all" | "pinned" | "search";

/** 고정 타일 reorder visual의 CSS animation 단계. */
export type WindowsPanelPinnedItemAnimationPhase = "in" | "out";

/** 특정 고정 타일에 적용할 reorder visual 상태. */
export interface WindowsPanelPinnedItemAnimation {
  /** animation class를 적용할 고정 항목 id. */
  itemId: string;
  /** out은 축소 transition, in은 새 위치 fade-in animation을 표시한다. */
  phase: WindowsPanelPinnedItemAnimationPhase;
}

/** WindowsPanelUI 모두 보기에서 category header와 항목 목록을 묶는 section. */
export interface WindowsPanelSection {
  /** 카테고리 점프 overlay와 header에 표시할 category 이름. */
  category: string;
  /** 해당 category 아래에 표시할 전체 항목 목록. */
  items: WindowItem[];
}

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
  onViewChange?: (view: WindowsPanelView) => void;
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
  view?: WindowsPanelView;
}

// 원본 findFileIcon()은 항상 file 아이콘을 반환 — icon 미지정 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * 시작 패널의 pinned/all/search visual을 controlled props로 렌더링한다 (원본 WindowsPanelUI).
 * view, overlay, reorder, context menu와 pin 동작은 모두 외부 기능 계층에 위임한다.
 * 시작 패널의 접근성 role은 dialog로 고정한다.
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
  categoryOverlayOpen = false,
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
  pinnedItemAnimation = null,
  pinnedItems = [],
  searchInputProps,
  searchResults = [],
  searchValue = "",
  sections = [],
  view = "pinned",
  ...props
}: WindowsPanelUIProps) => {
  const requestPinnedView = () => {
    onCategoryOverlayOpenChange?.(false);
    onViewChange?.("pinned");
  };

  const requestCategory = (category: string) => {
    onCategorySelect?.(category);
    onCategoryOverlayOpenChange?.(false);
  };

  return (
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
        <div className="wb-windows-panel__views" data-view={view}>
          <div
            className="wb-windows-panel__view wb-windows-panel__view--pinned"
            inert={view !== "pinned"}
          >
            <section className="wb-windows-panel__section">
              <header className="wb-windows-panel__header">
                <h2 className="wb-windows-panel__title">고정됨</h2>
                <button
                  className="wb-windows-panel__view-toggle"
                  onClick={() => onViewChange?.("all")}
                  type="button"
                >
                  모두 <ChevronRight12Regular aria-hidden="true" />
                </button>
              </header>
              <div className="wb-windows-panel__pinned-grid">
                {pinnedItems.map((item) => (
                  <PanelIconButton
                    key={item.id}
                    className={clsx(
                      "wb-windows-panel__pinned-item",
                      pinnedItemAnimation?.itemId === item.id &&
                        pinnedItemAnimation.phase === "out" &&
                        "wb-windows-panel__pinned-item--out",
                      pinnedItemAnimation?.itemId === item.id &&
                        pinnedItemAnimation.phase === "in" &&
                        "wb-windows-panel__pinned-item--in",
                    )}
                    icon={item.icon ?? defaultFileIcon}
                    onAnimationEnd={
                      onPinnedItemAnimationEnd
                        ? (event) => onPinnedItemAnimationEnd(event, item)
                        : undefined
                    }
                    onClick={() => onSelectItem?.(item)}
                    onContextMenu={
                      onItemContextMenu
                        ? (event) => onItemContextMenu(event, item, "pinned")
                        : undefined
                    }
                    onTransitionEnd={
                      onPinnedItemTransitionEnd
                        ? (event) => onPinnedItemTransitionEnd(event, item)
                        : undefined
                    }
                    title={item.title}
                  />
                ))}
              </div>
            </section>
          </div>
          <div
            className="wb-windows-panel__view wb-windows-panel__view--all"
            inert={view !== "all"}
          >
            <section className="wb-windows-panel__section">
              <header className="wb-windows-panel__header">
                <h2 className="wb-windows-panel__title">모두</h2>
                <button
                  className="wb-windows-panel__view-toggle"
                  onClick={requestPinnedView}
                  type="button"
                >
                  뒤로 <ChevronLeft12Regular aria-hidden="true" />
                </button>
              </header>
              <div className="wb-windows-panel__all-body">
                <div
                  className="wb-windows-panel__category-overlay"
                  data-open={categoryOverlayOpen ? "true" : undefined}
                  inert={!categoryOverlayOpen}
                >
                  <div className="wb-windows-panel__category-grid">
                    {sections.map((section) => (
                      <button
                        key={section.category}
                        className="wb-windows-panel__category-jump"
                        onClick={() => requestCategory(section.category)}
                        type="button"
                      >
                        {section.category}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  ref={allListRef}
                  className="wb-windows-panel__all-list"
                  inert={categoryOverlayOpen}
                >
                  {sections.map((section) => (
                    <Fragment key={section.category}>
                      <button
                        className="wb-windows-panel__category"
                        data-category={section.category}
                        onClick={() => onCategoryOverlayOpenChange?.(true)}
                        type="button"
                      >
                        {section.category}
                      </button>
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          className="wb-windows-panel__item"
                          onClick={() => onSelectItem?.(item)}
                          onContextMenu={
                            onItemContextMenu
                              ? (event) => onItemContextMenu(event, item, "all")
                              : undefined
                          }
                          type="button"
                        >
                          <span aria-hidden="true" className="wb-windows-panel__item-icon">
                            {item.icon ?? defaultFileIcon}
                          </span>
                          {item.title}
                        </button>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </TaskPanel>
  );
};
