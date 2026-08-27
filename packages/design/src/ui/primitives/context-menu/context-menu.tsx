import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import {
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuContent,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
} from "../menu";
import type { ContextMenuRootProps, ContextMenuTriggerProps } from "./types";

import "./context-menu.css";

const classNames = (...names: Array<string | undefined>) => names.filter(Boolean).join(" ");

export function ContextMenuRoot({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuRootProps) {
  return (
    <BaseContextMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, { reason: details.reason })}
    />
  );
}

export const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
  function ContextMenuTrigger({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Trigger
        {...props}
        className={classNames("wd-context-menu-trigger", className)}
        ref={ref}
      />
    );
  },
);

export const ContextMenuContent = MenuContent;
export const ContextMenuItem = MenuItem;
export const ContextMenuCheckboxItem = MenuCheckboxItem;
export const ContextMenuRadioGroup = MenuRadioGroup;
export const ContextMenuRadioItem = MenuRadioItem;
export const ContextMenuSeparator = MenuSeparator;
export const ContextMenuSubmenuRoot = MenuSubmenuRoot;
export const ContextMenuSubmenuTrigger = MenuSubmenuTrigger;
export const ContextMenuSubmenuContent = MenuSubmenuContent;
export const ContextMenuSubmenu = MenuSubmenu;

export const ContextMenuUI = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  Separator: ContextMenuSeparator,
  Submenu: ContextMenuSubmenu,
} as const;
