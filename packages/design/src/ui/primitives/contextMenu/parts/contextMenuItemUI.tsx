import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIItemProps } from "../contextMenuUI.types";

/**
 * 일반 context action의 role, disabled state, 선택 event를 제공한다.
 * 실제 제품 action의 부작용은 실행하지 않는다.
 */
export const ContextMenuItemUI = forwardRef<HTMLDivElement, ContextMenuUIItemProps>(
  function ContextMenuItemUI({ className, closeOnSelect, variant = "default", ...props }, ref) {
    return (
      <BaseContextMenu.Item
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      />
    );
  },
);
