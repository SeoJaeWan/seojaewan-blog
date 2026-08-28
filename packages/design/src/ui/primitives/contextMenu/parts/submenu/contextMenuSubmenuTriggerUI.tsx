import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUISubmenuTriggerProps } from "../../contextMenuUI.types";

/**
 * 중첩 context menu를 여는 menuitem role과 open state를 제공한다.
 *
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
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
      className={clsx("wd-menu-ui__item", "wd-menu-ui__submenu-trigger", className)}
      data-variant={variant}
      delay={openDelay}
      ref={ref}
    >
      <span className="wd-menu-ui__item-label">{children}</span>
      <span aria-hidden="true" className="wd-menu-ui__submenu-trigger-arrow">
        ›
      </span>
    </BaseContextMenu.SubmenuTrigger>
  );
});
