import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIRadioItemProps } from "../../contextMenuUI.types";

/**
 * 문맥 메뉴에서 상호 배타적인 선택지 하나를 나타낼 때 사용한다.
 *
 * ContextMenuRadioGroupUI 안에서 같은 그룹의 다른 RadioItem과 나란히 조합한다.
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
