import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

export type MenuUIOpenChangeReason =
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

export interface MenuUIChangeDetails {
  reason: MenuUIOpenChangeReason;
}

export type MenuUIOpenChangeHandler = (open: boolean, details: MenuUIChangeDetails) => void;

export interface MenuUIProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEscape?: boolean;
  onOpenChange?: MenuUIOpenChangeHandler;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface MenuUITriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
  nativeButton?: boolean;
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

export type MenuUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export type MenuUIPlacementAlign = "start" | "center" | "end";

export type MenuUICloseInteraction = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

export type MenuUIFinalFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interaction: MenuUICloseInteraction) => boolean | HTMLElement | null | undefined);

export interface MenuUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: MenuUIPlacementSide;
  align?: MenuUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: MenuUIFinalFocus;
}

export type MenuUIItemVariant = "default" | "danger";

export interface MenuUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  disabled?: boolean;
  label?: string;
  closeOnSelect?: boolean;
  variant?: MenuUIItemVariant;
}

export interface MenuUICheckboxItemProps extends Omit<MenuUIItemProps, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: MenuUIChangeDetails) => void;
}

export interface MenuUIRadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string, details: MenuUIChangeDetails) => void;
}

export interface MenuUIRadioItemProps extends MenuUIItemProps {
  value: string;
}

export interface MenuUISeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  orientation?: "horizontal" | "vertical";
}

export type MenuUISubmenuProps = Omit<MenuUIProps, "modal">;

export interface MenuUISubmenuTriggerProps extends Omit<MenuUIItemProps, "closeOnSelect"> {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}
