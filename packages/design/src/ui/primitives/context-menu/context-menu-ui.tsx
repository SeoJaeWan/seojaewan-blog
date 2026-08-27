import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import {
  MenuCheckboxItemUI,
  MenuContentUI,
  MenuItemUI,
  MenuRadioGroupUI,
  MenuRadioItemUI,
  MenuSeparatorUI,
  MenuSubmenuContentUI,
  MenuSubmenuRootUI,
  MenuSubmenuTriggerUI,
  MenuSubmenuUI,
} from "../menu";
import type { ContextMenuUIProps, ContextMenuUITriggerProps } from "./context-menu-ui.types";

import "./context-menu-ui.css";

export function ContextMenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuUIProps) {
  return (
    <BaseContextMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, { reason: details.reason })}
    />
  );
}

export const ContextMenuTriggerUI = forwardRef<HTMLDivElement, ContextMenuUITriggerProps>(
  function ContextMenuTriggerUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Trigger
        {...props}
        className={clsx("wd-context-menu-ui__trigger", className)}
        ref={ref}
      />
    );
  },
);

export const ContextMenuContentUI = MenuContentUI;
export const ContextMenuItemUI = MenuItemUI;
export const ContextMenuCheckboxItemUI = MenuCheckboxItemUI;
export const ContextMenuRadioGroupUI = MenuRadioGroupUI;
export const ContextMenuRadioItemUI = MenuRadioItemUI;
export const ContextMenuSeparatorUI = MenuSeparatorUI;
export const ContextMenuSubmenuRootUI = MenuSubmenuRootUI;
export const ContextMenuSubmenuTriggerUI = MenuSubmenuTriggerUI;
export const ContextMenuSubmenuContentUI = MenuSubmenuContentUI;
export const ContextMenuSubmenuUI = MenuSubmenuUI;

export const ContextMenuUI = {
  Root: ContextMenuRootUI,
  Trigger: ContextMenuTriggerUI,
  Content: ContextMenuContentUI,
  Item: ContextMenuItemUI,
  CheckboxItem: ContextMenuCheckboxItemUI,
  RadioGroup: ContextMenuRadioGroupUI,
  RadioItem: ContextMenuRadioItemUI,
  Separator: ContextMenuSeparatorUI,
  Submenu: ContextMenuSubmenuUI,
} as const;
