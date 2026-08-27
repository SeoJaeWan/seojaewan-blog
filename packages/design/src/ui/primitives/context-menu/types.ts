import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";

import type {
  MenuChangeDetails,
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuItemProps,
  MenuOpenChangeHandler,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubmenuRootProps,
  MenuSubmenuTriggerProps,
} from "../menu";

export interface ContextMenuRootProps extends Omit<MenuRootProps, "modal"> {
  children?: ReactNode;
}

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  render?: ReactElement;
}

export type ContextMenuChangeDetails = MenuChangeDetails;
export type ContextMenuOpenChangeHandler = MenuOpenChangeHandler;
export type ContextMenuContentProps = MenuContentProps;
export type ContextMenuItemProps = MenuItemProps;
export type ContextMenuCheckboxItemProps = MenuCheckboxItemProps;
export type ContextMenuRadioGroupProps = MenuRadioGroupProps;
export type ContextMenuRadioItemProps = MenuRadioItemProps;
export type ContextMenuSeparatorProps = MenuSeparatorProps;
export type ContextMenuSubmenuRootProps = MenuSubmenuRootProps;
export type ContextMenuSubmenuTriggerProps = MenuSubmenuTriggerProps;
