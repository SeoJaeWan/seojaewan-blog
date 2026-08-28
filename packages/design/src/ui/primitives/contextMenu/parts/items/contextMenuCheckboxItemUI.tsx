import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUICheckboxItemProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/contextMenuUIChangeDetails";

/**
 * boolean context action의 checked state와 변경 event를 제공한다.
 *
 * 선택값을 제품 상태에 저장하지 않는다.
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
