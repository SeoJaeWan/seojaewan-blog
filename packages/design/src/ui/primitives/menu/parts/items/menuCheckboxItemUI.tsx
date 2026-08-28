import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUICheckboxItemProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/toMenuUIChangeDetails";

/**
 * 켜짐과 꺼짐을 독립적으로 선택하는 메뉴 항목이 필요할 때 사용한다.
 *
 * MenuContentUI 또는 MenuSubmenuContentUI 안에서 다른 항목과 나란히 조합한다.
 */
export const MenuCheckboxItemUI = forwardRef<HTMLDivElement, MenuUICheckboxItemProps>(
  function MenuCheckboxItemUI(
    { children, className, closeOnSelect, onCheckedChange, variant = "default", ...props },
    ref,
  ) {
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
        <BaseMenu.CheckboxItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ✓
        </BaseMenu.CheckboxItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseMenu.CheckboxItem>
    );
  },
);
