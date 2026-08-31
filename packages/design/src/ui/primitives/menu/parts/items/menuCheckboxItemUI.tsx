import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Checkmark12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { MenuUICheckboxItemProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/toMenuUIChangeDetails";
import { MenuItemPresentation } from "./menuItemPresentation";

/**
 * 켜짐과 꺼짐을 독립적으로 선택하는 메뉴 항목이 필요할 때 사용한다.
 *
 * MenuContentUI 또는 MenuSubmenuContentUI 안에서 다른 항목과 나란히 조합한다.
 */
export function MenuCheckboxItemUI({
  children,
  className,
  closeOnSelect,
  icon,
  onCheckedChange,
  trailing,
  variant = "default",
  ref,
  ...props
}: MenuUICheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem
      {...props}
      className={clsx("wd-menu-ui__item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      onCheckedChange={(checked, details) =>
        onCheckedChange?.(checked, toMenuUIChangeDetails(details.reason))
      }
      ref={ref}
    >
      <MenuItemPresentation
        icon={icon}
        indicator={
          <BaseMenu.CheckboxItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
            <Checkmark12Regular />
          </BaseMenu.CheckboxItemIndicator>
        }
        trailing={trailing}
      >
        {children}
      </MenuItemPresentation>
    </BaseMenu.CheckboxItem>
  );
}
