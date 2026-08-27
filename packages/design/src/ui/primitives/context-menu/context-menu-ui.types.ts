import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";

import type {
  MenuUIChangeDetails,
  MenuUICheckboxItemProps,
  MenuUIContentProps,
  MenuUIItemProps,
  MenuUIOpenChangeHandler,
  MenuUIProps,
  MenuUIRadioGroupProps,
  MenuUIRadioItemProps,
  MenuUISeparatorProps,
  MenuUISubmenuProps,
  MenuUISubmenuTriggerProps,
} from "../menu";

export interface ContextMenuUIProps extends Omit<MenuUIProps, "modal"> {
  children?: ReactNode;
}

export interface ContextMenuUITriggerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  render?: ReactElement;
}

export type ContextMenuUIChangeDetails = MenuUIChangeDetails;
export type ContextMenuUIOpenChangeHandler = MenuUIOpenChangeHandler;
export type ContextMenuUIContentProps = MenuUIContentProps;
export type ContextMenuUIItemProps = MenuUIItemProps;
export type ContextMenuUICheckboxItemProps = MenuUICheckboxItemProps;
export type ContextMenuUIRadioGroupProps = MenuUIRadioGroupProps;
export type ContextMenuUIRadioItemProps = MenuUIRadioItemProps;
export type ContextMenuUISeparatorProps = MenuUISeparatorProps;
export type ContextMenuUISubmenuProps = MenuUISubmenuProps;
export type ContextMenuUISubmenuTriggerProps = MenuUISubmenuTriggerProps;
