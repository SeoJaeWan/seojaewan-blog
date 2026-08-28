import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUISeparatorProps } from "../contextMenuUI.types";

/**
 * context action 묶음 사이의 의미상 separator를 제공한다.
 * 제품 action을 그룹화하는 규칙은 결정하지 않는다.
 */
export const ContextMenuSeparatorUI = forwardRef<HTMLDivElement, ContextMenuUISeparatorProps>(
  function ContextMenuSeparatorUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Separator
        {...props}
        className={clsx("wd-menu-ui__separator", className)}
        ref={ref}
      />
    );
  },
);
