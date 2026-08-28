import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUISubmenuTriggerProps } from "../../menuUI.types";

/**
 * 중첩 menu를 여는 menuitem role과 open state를 제공한다.
 *
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
 */
export const MenuSubmenuTriggerUI = forwardRef<HTMLDivElement, MenuUISubmenuTriggerProps>(
  function MenuSubmenuTriggerUI(
    { children, className, openDelay, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.SubmenuTrigger
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
      </BaseMenu.SubmenuTrigger>
    );
  },
);
