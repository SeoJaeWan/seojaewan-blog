import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIRadioItemProps } from "../contextMenuUI.types";

/**
 * context radio action의 checked state와 선택 가능한 값을 제공한다.
 * 제품 설정의 의미는 해석하지 않는다.
 */
export const ContextMenuRadioItemUI = forwardRef<HTMLDivElement, ContextMenuUIRadioItemProps>(
  function ContextMenuRadioItemUI(
    { children, className, closeOnSelect, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseContextMenu.RadioItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      >
        <BaseContextMenu.RadioItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ●
        </BaseContextMenu.RadioItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseContextMenu.RadioItem>
    );
  },
);
