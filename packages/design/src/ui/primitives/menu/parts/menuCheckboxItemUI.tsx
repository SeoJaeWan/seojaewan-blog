import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUICheckboxItemProps } from "../menuUI.types";
import { toMenuUIChangeDetails } from "../menuUIChangeDetails";

/**
 * boolean 선택 action의 checked state와 변경 event를 제공한다.
 * 선택값을 제품 상태에 저장하지 않는다.
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
