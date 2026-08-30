import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUISeparatorProps } from "../../contextMenuUI.types";

/**
 * 서로 다른 의미의 문맥 메뉴 항목 묶음을 시각적·의미적으로 나눌 때 사용한다.
 *
 * ContextMenuContentUI 안에서 나누려는 두 항목 묶음 사이에 조합한다.
 */
export const ContextMenuSeparatorUI = forwardRef<HTMLDivElement, ContextMenuUISeparatorProps>(
  function ContextMenuSeparatorUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Separator
        {...props}
        className={clsx("wd-menu-ui__separator", "wd-context-menu-ui__separator", className)}
        ref={ref}
      />
    );
  },
);
