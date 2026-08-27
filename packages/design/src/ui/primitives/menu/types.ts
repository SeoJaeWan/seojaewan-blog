import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

export type MenuOpenChangeReason =
  | "trigger-press"
  | "trigger-hover"
  | "trigger-focus"
  | "outside-press"
  | "focus-out"
  | "list-navigation"
  | "escape-key"
  | "item-press"
  | "close-press"
  | "sibling-open"
  | "cancel-open"
  | "imperative-action"
  | "none";

export interface MenuChangeDetails {
  reason: MenuOpenChangeReason;
}

export type MenuOpenChangeHandler = (open: boolean, details: MenuChangeDetails) => void;

export interface MenuRootProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEscape?: boolean;
  onOpenChange?: MenuOpenChangeHandler;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface MenuTriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
  nativeButton?: boolean;
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

export type MenuPlacementSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export type MenuPlacementAlign = "start" | "center" | "end";

export type MenuCloseInteraction = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

export type MenuFinalFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interaction: MenuCloseInteraction) => boolean | HTMLElement | null | undefined);

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: MenuPlacementSide;
  align?: MenuPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: MenuFinalFocus;
}

export type MenuItemVariant = "default" | "danger";

export interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  disabled?: boolean;
  label?: string;
  closeOnSelect?: boolean;
  variant?: MenuItemVariant;
}

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: MenuChangeDetails) => void;
}

export interface MenuRadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string, details: MenuChangeDetails) => void;
}

export interface MenuRadioItemProps extends MenuItemProps {
  value: string;
}

export interface MenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  orientation?: "horizontal" | "vertical";
}

export type MenuSubmenuRootProps = Omit<MenuRootProps, "modal">;

export interface MenuSubmenuTriggerProps extends Omit<MenuItemProps, "closeOnSelect"> {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}
