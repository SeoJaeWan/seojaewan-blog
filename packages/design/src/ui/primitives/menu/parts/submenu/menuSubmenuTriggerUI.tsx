import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { MenuUISubmenuTriggerProps } from "../../menuUI.types";

/**
 * 하위 메뉴가 있음을 나타내고 그 메뉴를 여는 항목이 필요할 때 사용한다.
 *
 * MenuSubmenuRootUI 안에서 MenuSubmenuContentUI 앞에 조합한다.
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
          <ChevronRight12Regular />
        </span>
      </BaseMenu.SubmenuTrigger>
    );
  },
);
