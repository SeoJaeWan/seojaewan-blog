import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";

import {
  ChevronRight16Regular,
  FolderOpen16Regular,
  Open16Regular,
  Pin16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { WindowItem } from "../../../../types/windowItem";

/** TaskSearchResultView 상세 pane에서 선택 가능한 action id. */
export type TaskSearchDetailAction = "open" | "openLocation" | "pinToStart" | "pinToTaskbar";

/**
 * TaskSearchResultView가 결과 row와 상세 pane에 표시할 항목.
 */
export interface TaskSearchResultItem extends WindowItem {
  /** 상세 pane에서 제목 아래에 표시할 타입 설명. */
  typeLabel?: string;
}

export interface TaskSearchResultViewProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "results"
> {
  /** 상세 pane에 표시할 결과 항목 id. null이거나 결과에 없으면 상세 pane을 비운다. */
  detailItemId?: string | null;
  /** 상세 pane action 클릭 시 action id와 item을 전달한다. */
  onDetailAction?: (action: TaskSearchDetailAction, item: TaskSearchResultItem) => void;
  /** 상세 보기 버튼 클릭 시 선택한 item을 전달한다. */
  onDetailItemChange?: (item: TaskSearchResultItem) => void;
  /** 결과 row의 contextmenu 이벤트와 대상 item을 기능 계층에 전달한다. */
  onItemContextMenu?: (event: MouseEvent<HTMLButtonElement>, item: TaskSearchResultItem) => void;
  /** 결과 row 또는 상세 summary 클릭 시 선택 item을 전달한다. */
  onSelectItem?: (item: TaskSearchResultItem) => void;
  /** 검색 결과 목록. 기본값은 빈 배열이다. */
  results?: TaskSearchResultItem[];
}

// 원본 findFileIcon()은 항상 file 아이콘을 반환 — icon 미지정 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

const DETAIL_ACTIONS: { action: TaskSearchDetailAction; icon: ReactNode; label: string }[] = [
  { action: "open", icon: <Open16Regular />, label: "열기" },
  { action: "openLocation", icon: <FolderOpen16Regular />, label: "파일 위치 열기" },
  { action: "pinToStart", icon: <Pin16Regular />, label: "시작 화면에 고정" },
  { action: "pinToTaskbar", icon: <Pin16Regular />, label: "작업 표시줄에 고정" },
];

/**
 * 검색 결과 뷰 (원본 TaskSearchResult) — 최적의 일치 목록 + 선택 항목 상세 pane.
 * SearchPanel과 WindowsPanelUI(검색어 입력 시)가 공유한다.
 * 상세 pane 선택은 detailItemId로 제어하고 모든 항목 동작은 callback으로 외부에 위임한다.
 *
 * @param props.results 검색 결과 row와 상세 pane 후보로 표시할 항목
 * @param props.detailItemId 상세 pane에 표시할 결과 항목 id. 기본값은 null
 * @param props.onDetailItemChange 상세 보기 버튼 클릭을 외부 선택 상태에 위임하는 callback
 * @param props.onSelectItem 결과 row 또는 상세 summary 선택을 앱에 위임하는 callback
 * @param props.onDetailAction 상세 pane action 선택을 앱에 위임하는 callback
 * @param props.onItemContextMenu 결과 row의 contextmenu 이벤트를 기능 계층에 위임하는 callback
 * @param props.className 결과 view root에 추가할 className
 */
export const TaskSearchResultView = ({
  className,
  detailItemId = null,
  onDetailAction,
  onDetailItemChange,
  onItemContextMenu,
  onSelectItem,
  results = [],
  ...props
}: TaskSearchResultViewProps) => {
  const detailItem = results.find((item) => item.id === detailItemId) ?? null;

  return (
    <div className={clsx("wb-task-search-result", className)} {...props}>
      <section className="wb-task-search-result__list-pane">
        <h2 className="wb-task-search-result__heading">최적의 일치</h2>
        <ul className="wb-task-search-result__list">
          {results.map((item) => (
            <li key={item.id} className="wb-task-search-result__row">
              <button
                className="wb-task-search-result__main"
                onClick={() => onSelectItem?.(item)}
                onContextMenu={
                  onItemContextMenu ? (event) => onItemContextMenu(event, item) : undefined
                }
                type="button"
              >
                <span aria-hidden="true" className="wb-task-search-result__icon">
                  {item.icon ?? defaultFileIcon}
                </span>
                <h3 className="wb-task-search-result__title">{item.title}</h3>
              </button>
              <button
                aria-label={`${item.title} 자세히`}
                className="wb-task-search-result__detail-toggle"
                data-selected={detailItemId === item.id ? "true" : undefined}
                onClick={() => onDetailItemChange?.(item)}
                type="button"
              >
                <ChevronRight16Regular aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      {detailItem ? (
        <div className="wb-task-search-result__detail">
          <button
            className="wb-task-search-result__detail-summary"
            onClick={() => onSelectItem?.(detailItem)}
            type="button"
          >
            <span aria-hidden="true" className="wb-task-search-result__detail-icon">
              {detailItem.icon ?? defaultFileIcon}
            </span>
            <h4 className="wb-task-search-result__detail-title">{detailItem.title}</h4>
            {detailItem.typeLabel ? (
              <p className="wb-task-search-result__detail-type">{detailItem.typeLabel}</p>
            ) : null}
          </button>
          <div className="wb-task-search-result__detail-actions">
            {DETAIL_ACTIONS.map(({ action, icon, label }) => (
              <button
                key={action}
                className="wb-task-search-result__detail-action"
                onClick={() => onDetailAction?.(action, detailItem)}
                type="button"
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
};
