import { Document20Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import { PanelIconButtonUI } from "./panelIconButtonUI";
import type { TaskSearchRecommendationViewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** 검색 전 recommendation list와 best presentation sections를 생산한다. */
export const TaskSearchRecommendationViewUI = ({
  bestSections = [],
  className,
  onItemSelect,
  recommendedItems = [],
  ...props
}: TaskSearchRecommendationViewUIProps) => (
  <div {...props} className={clsx("wd-task-search-recommendation-view-ui", className)}>
    <section className="wd-task-search-recommendation-view-ui__recommended">
      <h2>추천</h2>
      <div className="wd-task-search-recommendation-view-ui__recommended-list">
        {recommendedItems.map((item) => (
          <ButtonUI
            key={item.value}
            disabled={item.disabled}
            onClick={() => onItemSelect?.(item.value)}
          >
            <span aria-hidden="true">{item.icon ?? <Document20Regular />}</span>
            <span>{item.label}</span>
          </ButtonUI>
        ))}
      </div>
    </section>
    <div className="wd-task-search-recommendation-view-ui__best">
      {bestSections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <div className="wd-task-search-recommendation-view-ui__best-grid">
            {section.entries.slice(0, 6).map((item) => (
              <PanelIconButtonUI
                key={item.value}
                disabled={item.disabled}
                icon={item.icon ?? <Document20Regular />}
                lines={1}
                onClick={() => onItemSelect?.(item.value)}
                title={item.label}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);
