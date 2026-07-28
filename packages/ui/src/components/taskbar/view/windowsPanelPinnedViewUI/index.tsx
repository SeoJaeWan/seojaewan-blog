import type { AnimationEvent, MouseEvent, TransitionEvent } from "react";

import { ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";
import { PanelIconButtonUI } from "../../button/panelIconButtonUI";

/** 고정 타일 reorder visual의 CSS animation 단계. */
export type WindowsPanelPinnedItemAnimationPhase = "in" | "out";

/** 특정 고정 타일에 적용할 reorder visual 상태. */
export interface WindowsPanelPinnedItemAnimation {
  /** animation class를 적용할 고정 항목 id. */
  itemId: string;
  /** out은 축소 transition, in은 새 위치 fade-in animation을 표시한다. */
  phase: WindowsPanelPinnedItemAnimationPhase;
}

/** WindowsPanelPinnedViewUI의 visual 상태와 외부에 위임할 interaction callback. */
export interface WindowsPanelPinnedViewUIProps {
  /** 현재 고정됨 화면이 활성 상태인지 나타낸다. 기본값은 true이다. */
  active?: boolean;
  /** 표시할 고정 항목 목록. 기본값은 빈 배열이다. */
  items?: WindowItem[];
  /** 고정 타일 하나에 적용할 reorder visual 상태. 기본값은 null이다. */
  itemAnimation?: WindowsPanelPinnedItemAnimation | null;
  /** 고정 타일 fade-in animation 종료 이벤트를 전달한다. */
  onItemAnimationEnd?: (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 항목 contextmenu 이벤트와 대상을 전달한다. */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 항목 선택을 전달한다. */
  onItemSelect?: (item: WindowItem) => void;
  /** 고정 타일 축소 transition 종료 이벤트를 전달한다. */
  onItemTransitionEnd?: (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** 모두 화면으로 이동하는 요청을 전달한다. */
  onShowAll?: () => void;
}

const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * 시작 panel의 고정됨 header, view 전환 버튼과 고정 타일 grid를 렌더링한다.
 * 화면 navigation, pin animation 상태와 item action은 외부 기능 계층에 위임한다.
 */
export const WindowsPanelPinnedViewUI = ({
  active = true,
  items = [],
  itemAnimation = null,
  onItemAnimationEnd,
  onItemContextMenu,
  onItemSelect,
  onItemTransitionEnd,
  onShowAll,
}: WindowsPanelPinnedViewUIProps) => (
  <div className="wb-windows-panel__view wb-windows-panel__view--pinned" inert={!active}>
    <section className="wb-windows-panel__section">
      <header className="wb-windows-panel__header">
        <h2 className="wb-windows-panel__title">고정됨</h2>
        <button className="wb-windows-panel__view-toggle" onClick={onShowAll} type="button">
          모두 <ChevronRight12Regular aria-hidden="true" />
        </button>
      </header>
      <div className="wb-windows-panel__pinned-grid">
        {items.map((item) => (
          <PanelIconButtonUI
            key={item.id}
            className={clsx(
              "wb-windows-panel__pinned-item",
              itemAnimation?.itemId === item.id &&
                itemAnimation.phase === "out" &&
                "wb-windows-panel__pinned-item--out",
              itemAnimation?.itemId === item.id &&
                itemAnimation.phase === "in" &&
                "wb-windows-panel__pinned-item--in",
            )}
            icon={item.icon ?? defaultFileIcon}
            onAnimationEnd={
              onItemAnimationEnd ? (event) => onItemAnimationEnd(event, item) : undefined
            }
            onClick={() => onItemSelect?.(item)}
            onContextMenu={
              onItemContextMenu ? (event) => onItemContextMenu(event, item) : undefined
            }
            onTransitionEnd={
              onItemTransitionEnd ? (event) => onItemTransitionEnd(event, item) : undefined
            }
            title={item.title}
          />
        ))}
      </div>
    </section>
  </div>
);
