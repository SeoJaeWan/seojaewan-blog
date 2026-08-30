import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Checkmark12Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { ContextMenuUICheckboxItemProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/toContextMenuUIChangeDetails";
import { ContextMenuItemPresentation } from "./contextMenuItemPresentation";

/**
 * 문맥 메뉴에서 켜짐과 꺼짐을 독립적으로 선택하는 항목이 필요할 때 사용한다.
 *
 * ContextMenuContentUI 또는 중첩 Content 안에서 다른 항목과 나란히 조합한다.
 */
export const ContextMenuCheckboxItemUI = forwardRef<HTMLDivElement, ContextMenuUICheckboxItemProps>(
  function ContextMenuCheckboxItemUI(
    {
      children,
      className,
      closeOnSelect,
      icon,
      onCheckedChange,
      trailing,
      variant = "default",
      ...props
    },
    ref,
  ) {
    return (
      <BaseContextMenu.CheckboxItem
        {...props}
        className={clsx("wd-menu-ui__item", "wd-context-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        onCheckedChange={(checked, details) =>
          onCheckedChange?.(checked, toContextMenuUIChangeDetails(details.reason))
        }
        ref={ref}
      >
        <ContextMenuItemPresentation
          icon={icon}
          indicator={
            <BaseContextMenu.CheckboxItemIndicator
              className="wd-menu-ui__item-indicator wd-context-menu-ui__item-indicator"
              keepMounted
            >
              <Checkmark12Regular />
            </BaseContextMenu.CheckboxItemIndicator>
          }
          trailing={trailing}
        >
          {children}
        </ContextMenuItemPresentation>
      </BaseContextMenu.CheckboxItem>
    );
  },
);
