import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ChevronRight12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { MenuUISubmenuTriggerProps } from "../../menuUI.types";
import { MenuItemPresentation } from "../items/menuItemPresentation";

/**
 * 하위 메뉴가 있음을 나타내고 그 메뉴를 여는 항목이 필요할 때 사용한다.
 *
 * MenuSubmenuRootUI 안에서 MenuSubmenuContentUI 앞에 조합한다.
 */
export function MenuSubmenuTriggerUI({
  children,
  className,
  icon,
  openDelay,
  trailing,
  variant = "default",
  ref,
  ...props
}: MenuUISubmenuTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger
      {...props}
      className={clsx("wd-menu-ui__item", "wd-menu-ui__submenu-trigger", className)}
      data-variant={variant}
      delay={openDelay}
      ref={ref}
    >
      <MenuItemPresentation
        arrow={
          <span aria-hidden="true" className="wd-menu-ui__submenu-trigger-arrow">
            <ChevronRight12Regular />
          </span>
        }
        icon={icon}
        trailing={trailing}
      >
        {children}
      </MenuItemPresentation>
    </BaseMenu.SubmenuTrigger>
  );
}
