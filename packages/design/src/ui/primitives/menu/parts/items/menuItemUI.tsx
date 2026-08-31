import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIItemProps } from "../../menuUI.types";
import { MenuItemPresentation } from "./menuItemPresentation";

/**
 * 한 번 선택하는 일반 메뉴 항목을 표현할 때 사용한다.
 *
 * MenuContentUI 또는 MenuSubmenuContentUI 안에서 항목 단위로 조합한다.
 */
export function MenuItemUI({
  children,
  className,
  closeOnSelect,
  icon,
  trailing,
  variant = "default",
  ref,
  ...props
}: MenuUIItemProps) {
  return (
    <BaseMenu.Item
      {...props}
      className={clsx("wd-menu-ui__item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      ref={ref}
    >
      <MenuItemPresentation icon={icon} trailing={trailing}>
        {children}
      </MenuItemPresentation>
    </BaseMenu.Item>
  );
}
