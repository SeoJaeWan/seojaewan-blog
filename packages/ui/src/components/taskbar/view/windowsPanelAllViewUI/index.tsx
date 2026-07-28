import type { MouseEvent, Ref } from "react";
import { Fragment } from "react";

import { ChevronLeft12Regular } from "@fluentui/react-icons";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";

/** 모두 화면에서 category header와 항목 목록을 묶는 section. */
export interface WindowsPanelAllSection {
  /** category jump overlay와 header에 표시할 category 이름. */
  category: string;
  /** 해당 category 아래에 표시할 전체 항목 목록. */
  items: WindowItem[];
}

/** WindowsPanelAllViewUI의 visual 상태와 외부에 위임할 interaction callback. */
export interface WindowsPanelAllViewUIProps {
  /** 현재 모두 화면이 활성 상태인지 나타낸다. 기본값은 true이다. */
  active?: boolean;
  /** category jump overlay의 열린 visual 상태. 기본값은 false이다. */
  categoryOverlayOpen?: boolean;
  /** 모두 화면의 scroll container를 외부 기능 계층에 전달할 ref. */
  listRef?: Ref<HTMLDivElement>;
  /** 고정됨 화면으로 돌아가는 요청을 전달한다. */
  onBack?: () => void;
  /** category overlay의 다음 open 상태를 전달한다. */
  onCategoryOverlayOpenChange?: (open: boolean) => void;
  /** category jump 항목 선택을 전달한다. */
  onCategorySelect?: (category: string) => void;
  /** 항목 contextmenu 이벤트와 대상을 전달한다. */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 항목 선택을 전달한다. */
  onItemSelect?: (item: WindowItem) => void;
  /** category별로 표시할 section 목록. 기본값은 빈 배열이다. */
  sections?: WindowsPanelAllSection[];
}

const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * 시작 panel의 모두 header, category overlay와 전체 항목 목록을 렌더링한다.
 * 화면 navigation, category 상태와 item action은 외부 기능 계층에 위임한다.
 */
export const WindowsPanelAllViewUI = ({
  active = true,
  categoryOverlayOpen = false,
  listRef,
  onBack,
  onCategoryOverlayOpenChange,
  onCategorySelect,
  onItemContextMenu,
  onItemSelect,
  sections = [],
}: WindowsPanelAllViewUIProps) => (
  <div className="wb-windows-panel__view wb-windows-panel__view--all" inert={!active}>
    <section className="wb-windows-panel__section">
      <header className="wb-windows-panel__header">
        <h2 className="wb-windows-panel__title">모두</h2>
        <button className="wb-windows-panel__view-toggle" onClick={onBack} type="button">
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
        <div ref={listRef} className="wb-windows-panel__all-list" inert={categoryOverlayOpen}>
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
                  onClick={() => onItemSelect?.(item)}
                  onContextMenu={
                    onItemContextMenu ? (event) => onItemContextMenu(event, item) : undefined
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
);
