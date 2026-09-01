import { ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import { PanelIconButtonUI } from "./panelIconButtonUI";
import type { WindowsPanelPinnedViewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Start panel의 Pinned header, six-column tile grid와 reorder visual을 생산한다. */
export const WindowsPanelPinnedViewUI = ({
  active = true,
  className,
  itemAnimation = null,
  items = [],
  onItemAnimationEnd,
  onItemSelect,
  onItemTransitionEnd,
  onShowAll,
  ...props
}: WindowsPanelPinnedViewUIProps) => (
  <section
    {...props}
    aria-hidden={!active || undefined}
    className={clsx("wd-windows-panel-view-ui", "wd-windows-panel-pinned-view-ui", className)}
    inert={!active}
  >
    <header className="wd-windows-panel-view-ui__header">
      <h2>고정됨</h2>
      <ButtonUI className="wd-windows-panel-view-ui__toggle" onClick={onShowAll}>
        모두 <ChevronRight12Regular aria-hidden="true" />
      </ButtonUI>
    </header>
    <div aria-label="고정된 항목" className="wd-windows-panel-pinned-view-ui__grid" role="group">
      {items.map((item) => (
        <PanelIconButtonUI
          key={item.value}
          className={clsx(
            "wd-windows-panel-pinned-view-ui__item",
            itemAnimation?.value === item.value &&
              `wd-windows-panel-pinned-view-ui__item--${itemAnimation.phase}`,
          )}
          disabled={item.disabled}
          icon={item.icon}
          onAnimationEnd={(event) => onItemAnimationEnd?.(event, item.value)}
          onClick={() => onItemSelect?.(item.value)}
          onTransitionEnd={(event) => onItemTransitionEnd?.(event, item.value)}
          title={item.label}
        />
      ))}
    </div>
  </section>
);
