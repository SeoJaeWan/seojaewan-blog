import { ChevronRight16Regular, Document20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import type { TaskSearchResultViewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** 검색 결과 list와 controlled selected detail pane을 생산한다. */
export const TaskSearchResultViewUI = ({
  className,
  detailActions = [],
  detailValue = null,
  onDetailAction,
  onDetailValueChange,
  onItemSelect,
  results = [],
  ...props
}: TaskSearchResultViewUIProps) => {
  const detailItem = results.find((item) => item.value === detailValue) ?? null;

  return (
    <div {...props} className={clsx("wd-task-search-result-view-ui", className)}>
      <section className="wd-task-search-result-view-ui__list-pane">
        <h2>최적의 일치</h2>
        <div className="wd-task-search-result-view-ui__list">
          {results.map((item) => (
            <div key={item.value} className="wd-task-search-result-view-ui__row">
              <ButtonUI disabled={item.disabled} onClick={() => onItemSelect?.(item.value)}>
                <span aria-hidden="true">{item.icon ?? <Document20Regular />}</span>
                <span>{item.label}</span>
              </ButtonUI>
              <ButtonUI
                aria-label={`${item.label} 자세히`}
                data-selected={detailValue === item.value || undefined}
                disabled={item.disabled}
                onClick={() => onDetailValueChange?.(item.value)}
              >
                <ChevronRight16Regular aria-hidden="true" />
              </ButtonUI>
            </div>
          ))}
        </div>
      </section>
      {detailItem ? (
        <section
          aria-label={`${detailItem.label} 상세`}
          className="wd-task-search-result-view-ui__detail"
        >
          <ButtonUI
            className="wd-task-search-result-view-ui__detail-summary"
            onClick={() => onItemSelect?.(detailItem.value)}
          >
            <span aria-hidden="true">{detailItem.icon ?? <Document20Regular />}</span>
            <strong>{detailItem.label}</strong>
            {detailItem.description ? <small>{detailItem.description}</small> : null}
          </ButtonUI>
          <div className="wd-task-search-result-view-ui__detail-actions">
            {detailActions.map((action) => (
              <ButtonUI
                key={action.value}
                disabled={action.disabled}
                onClick={() => onDetailAction?.(action.value, detailItem.value)}
              >
                <span aria-hidden="true">{action.icon}</span>
                {action.label}
              </ButtonUI>
            ))}
          </div>
        </section>
      ) : (
        <div aria-hidden="true" />
      )}
    </div>
  );
};
