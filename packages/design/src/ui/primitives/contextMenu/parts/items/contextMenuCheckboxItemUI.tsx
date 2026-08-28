import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUICheckboxItemProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/toContextMenuUIChangeDetails";

/**
 * 문맥 메뉴에서 켜짐과 꺼짐을 독립적으로 선택하는 항목이 필요할 때 사용한다.
 *
 * ContextMenuContentUI 또는 중첩 Content 안에서 다른 항목과 나란히 조합한다.
 */
export const ContextMenuCheckboxItemUI = forwardRef<HTMLDivElement, ContextMenuUICheckboxItemProps>(
  function ContextMenuCheckboxItemUI(
    { children, className, closeOnSelect, onCheckedChange, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseContextMenu.CheckboxItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        onCheckedChange={(checked, details) =>
          onCheckedChange?.(checked, toContextMenuUIChangeDetails(details.reason))
        }
        ref={ref}
      >
        <BaseContextMenu.CheckboxItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ✓
        </BaseContextMenu.CheckboxItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseContextMenu.CheckboxItem>
    );
  },
);
