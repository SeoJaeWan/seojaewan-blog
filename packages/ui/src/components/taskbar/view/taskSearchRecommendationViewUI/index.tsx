import type { MouseEvent } from "react";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";

/** taskbar 검색 전 추천 화면의 best section. */
export interface TaskSearchRecommendationSection {
  /** 섹션 안의 추천 항목 목록. */
  items: WindowItem[];
  /** 섹션 제목. */
  title: string;
}

interface TaskSearchRecommendationViewUIProps {
  bestSections: readonly TaskSearchRecommendationSection[];
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => void;
  onSelectItem?: (item: WindowItem) => void;
  recommendedItems: readonly WindowItem[];
}

// 원본 findFileIcon()은 항상 file 아이콘을 반환 — icon 미지정 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * taskbar 검색 전 추천 뷰 — 추천 목록 + best section 목록.
 * 항목 선택과 contextmenu 동작은 callback으로 SearchPanelUI에 위임한다.
 *
 * @param props.recommendedItems 왼쪽 추천 목록에 표시할 항목
 * @param props.bestSections 오른쪽 best section에 표시할 항목
 * @param props.onSelectItem 추천/best 항목 선택 callback
 * @param props.onItemContextMenu 추천/best 항목 contextmenu callback
 */
export const TaskSearchRecommendationViewUI = ({
  bestSections,
  onItemContextMenu,
  onSelectItem,
  recommendedItems,
}: TaskSearchRecommendationViewUIProps) => (
  <div className="wb-task-search-recommendation">
    <div className="wb-task-search-recommendation__recommend">
      <h2 className="wb-task-search-recommendation__heading">추천</h2>
      <ul className="wb-task-search-recommendation__recommend-list">
        {recommendedItems.map((item) => (
          <li key={item.id}>
            <button
              className="wb-task-search-recommendation__recommend-item"
              onClick={() => onSelectItem?.(item)}
              onContextMenu={
                onItemContextMenu ? (event) => onItemContextMenu(event, item) : undefined
              }
              type="button"
            >
              <span aria-hidden="true" className="wb-task-search-recommendation__recommend-icon">
                {item.icon ?? defaultFileIcon}
              </span>
              <span className="wb-task-search-recommendation__recommend-title">{item.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    <div className="wb-task-search-recommendation__best">
      {bestSections.map((section) => (
        <section key={section.title} className="wb-task-search-recommendation__best-section">
          <h2 className="wb-task-search-recommendation__heading">{section.title}</h2>
          <ul className="wb-task-search-recommendation__best-list">
            {section.items.slice(0, 6).map((item) => (
              <li key={item.id} className="wb-task-search-recommendation__best-card">
                <button
                  className="wb-task-search-recommendation__best-item"
                  onClick={() => onSelectItem?.(item)}
                  onContextMenu={
                    onItemContextMenu ? (event) => onItemContextMenu(event, item) : undefined
                  }
                  type="button"
                >
                  <span aria-hidden="true" className="wb-task-search-recommendation__best-icon">
                    {item.icon ?? defaultFileIcon}
                  </span>
                  <span className="wb-task-search-recommendation__best-title">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </div>
);
