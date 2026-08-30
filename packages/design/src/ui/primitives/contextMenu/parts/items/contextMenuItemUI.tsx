import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIItemProps } from "../../contextMenuUI.types";
import { ContextMenuItemPresentation } from "./contextMenuItemPresentation";

/**
 * 한 번 선택하는 일반 문맥 메뉴 항목을 표현할 때 사용한다.
 *
 * ContextMenuContentUI 또는 중첩 Content 안에서 항목 단위로 조합한다.
 */
export const ContextMenuItemUI = forwardRef<HTMLDivElement, ContextMenuUIItemProps>(
  function ContextMenuItemUI(
    { children, className, closeOnSelect, icon, trailing, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseContextMenu.Item
        {...props}
        className={clsx("wd-menu-ui__item", "wd-context-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      >
        <ContextMenuItemPresentation icon={icon} trailing={trailing}>
          {children}
        </ContextMenuItemPresentation>
      </BaseContextMenu.Item>
    );
  },
);
