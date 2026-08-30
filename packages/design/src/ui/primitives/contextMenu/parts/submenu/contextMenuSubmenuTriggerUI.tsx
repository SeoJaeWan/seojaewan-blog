import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ContextMenuUISubmenuTriggerProps } from "../../contextMenuUI.types";

/**
 * 하위 문맥 메뉴가 있음을 나타내고 그 메뉴를 여는 항목이 필요할 때 사용한다.
 *
 * ContextMenuSubmenuRootUI 안에서 ContextMenuSubmenuContentUI 앞에 조합한다.
 */
export const ContextMenuSubmenuTriggerUI = forwardRef<
  HTMLDivElement,
  ContextMenuUISubmenuTriggerProps
>(function ContextMenuSubmenuTriggerUI(
  { children, className, openDelay, variant = "default", ...props },
  ref,
) {
  return (
    <BaseContextMenu.SubmenuTrigger
      {...props}
      className={clsx(
        "wd-menu-ui__item",
        "wd-menu-ui__submenu-trigger",
        "wd-context-menu-ui__item",
        "wd-context-menu-ui__submenu-trigger",
        className,
      )}
      data-variant={variant}
      delay={openDelay}
      ref={ref}
    >
      <span className="wd-menu-ui__item-label wd-context-menu-ui__item-label">{children}</span>
      <span
        aria-hidden="true"
        className="wd-menu-ui__submenu-trigger-arrow wd-context-menu-ui__submenu-trigger-arrow"
      >
        <ChevronRight12Regular />
      </span>
    </BaseContextMenu.SubmenuTrigger>
  );
});
