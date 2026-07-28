import type { AnimationEvent, MouseEvent, Ref, TransitionEvent } from "react";
import { Fragment } from "react";

import { ChevronLeft12Regular, ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";
import { PanelIconButtonUI } from "../../button/panelIconButtonUI";

/** WindowsPanelViewUI가 표시할 고정됨/모두 화면 모드. */
export type WindowsPanelViewMode = "all" | "pinned";

/** 고정 타일 reorder visual의 CSS animation 단계. */
export type WindowsPanelPinnedItemAnimationPhase = "in" | "out";

/** 특정 고정 타일에 적용할 reorder visual 상태. */
export interface WindowsPanelPinnedItemAnimation {
  /** animation class를 적용할 고정 항목 id. */
  itemId: string;
  /** out은 축소 transition, in은 새 위치 fade-in animation을 표시한다. */
  phase: WindowsPanelPinnedItemAnimationPhase;
}

/** WindowsPanelViewUI의 모두 화면에서 category header와 항목 목록을 묶는 section. */
export interface WindowsPanelSection {
  /** 카테고리 점프 overlay와 header에 표시할 category 이름. */
  category: string;
  /** 해당 category 아래에 표시할 전체 항목 목록. */
  items: WindowItem[];
}

/** WindowsPanelViewUI의 화면 상태와 외부 기능 계층에 위임할 interaction callback. */
export interface WindowsPanelViewUIProps {
  /** 모두 화면의 scroll container를 외부 기능 계층에 전달할 ref. */
  allListRef?: Ref<HTMLDivElement>;
  /** category jump overlay의 열린 visual 상태. 기본값은 false이다. */
  categoryOverlayOpen?: boolean;
  /** category overlay의 다음 open 상태를 기능 계층에 요청한다. */
  onCategoryOverlayOpenChange?: (open: boolean) => void;
  /** category jump 항목 선택을 기능 계층에 전달한다. */
  onCategorySelect?: (category: string) => void;
  /** 항목 contextmenu 이벤트와 대상/source를 기능 계층에 전달한다. */
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelViewMode,
  ) => void;
  /** 고정 타일 fade-in animation 종료 이벤트를 기능 계층에 전달한다. */
  onPinnedItemAnimationEnd?: (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 고정 타일 축소 transition 종료 이벤트를 기능 계층에 전달한다. */
  onPinnedItemTransitionEnd?: (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 고정됨/모두 항목 클릭 시 선택 item과 발생 화면을 기능 계층에 전달한다. */
  onSelectItem?: (item: WindowItem, source: WindowsPanelViewMode) => void;
  /** pinned/all 화면 변경을 기능 계층에 요청한다. */
  onViewChange?: (view: WindowsPanelViewMode) => void;
  /** 고정 타일 하나에 적용할 reorder visual 상태. 기본값은 null이다. */
  pinnedItemAnimation?: WindowsPanelPinnedItemAnimation | null;
  /** 고정됨 화면에 표시할 항목 목록. 기본값은 빈 배열이다. */
  pinnedItems?: WindowItem[];
  /** 모두 화면에서 category별로 표시할 section 목록. 기본값은 빈 배열이다. */
  sections?: WindowsPanelSection[];
  /** 현재 표시할 pinned/all 화면. 기본값은 "pinned"이다. */
  view?: WindowsPanelViewMode;
}

// 원본 findFileIcon()은 항상 file 아이콘을 반환 — icon 미지정 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * WindowsPanel의 검색 전 본문으로 고정됨/모두 화면을 렌더링한다.
 * 두 화면을 함께 유지하고 비활성 화면에 inert를 적용해 전환 구조를 보존한다.
 * 화면 전환, category overlay, 항목 선택과 reorder 종료 동작은 callback으로 외부에 위임한다.
 *
 * @param props.view 현재 표시할 pinned/all visual. 기본값은 "pinned"
 * @param props.categoryOverlayOpen category jump overlay의 열린 visual 상태
 * @param props.pinnedItemAnimation 고정 타일에 적용할 reorder visual 상태
 * @param props.pinnedItems 고정됨 view에 표시할 항목
 * @param props.sections 모두 보기의 category별 항목
 * @param props.allListRef 모두 보기 scroll container를 외부에 연결할 ref
 * @param props.onViewChange pinned/all view 변경 요청 callback
 * @param props.onCategoryOverlayOpenChange category overlay open 변경 요청 callback
 * @param props.onCategorySelect category jump 선택 callback
 * @param props.onSelectItem 고정됨/모두 항목과 발생 화면 선택 callback
 * @param props.onItemContextMenu 항목 contextmenu 이벤트와 source를 전달하는 callback
 * @param props.onPinnedItemTransitionEnd 고정 타일 transition 종료 callback
 * @param props.onPinnedItemAnimationEnd 고정 타일 animation 종료 callback
 */
export const WindowsPanelViewUI = ({
  allListRef,
  categoryOverlayOpen = false,
  onCategoryOverlayOpenChange,
  onCategorySelect,
  onItemContextMenu,
  onPinnedItemAnimationEnd,
  onPinnedItemTransitionEnd,
  onSelectItem,
  onViewChange,
  pinnedItemAnimation = null,
  pinnedItems = [],
  sections = [],
  view = "pinned",
}: WindowsPanelViewUIProps) => {
  return (
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
              <PanelIconButtonUI
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
                onClick={() => onSelectItem?.(item, "pinned")}
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
      <div className="wb-windows-panel__view wb-windows-panel__view--all" inert={view !== "all"}>
        <section className="wb-windows-panel__section">
          <header className="wb-windows-panel__header">
            <h2 className="wb-windows-panel__title">모두</h2>
            <button
              className="wb-windows-panel__view-toggle"
              onClick={() => onViewChange?.("pinned")}
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
                    onClick={() => onCategorySelect?.(section.category)}
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
                      onClick={() => onSelectItem?.(item, "all")}
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
  );
};
