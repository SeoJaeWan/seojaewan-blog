import type {
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

export type ContextMenuUIOpenChangeReason =
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

export interface ContextMenuUIChangeDetails {
  reason: ContextMenuUIOpenChangeReason;
}

export type ContextMenuUIOpenChangeHandler = (
  open: boolean,
  details: ContextMenuUIChangeDetails,
) => void;

export interface ContextMenuUIProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEscape?: boolean;
  onOpenChange?: ContextMenuUIOpenChangeHandler;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface ContextMenuUITriggerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  render?: ReactElement;
}

export type ContextMenuUIPlacementSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inline-start"
  | "inline-end";

export type ContextMenuUIPlacementAlign = "start" | "center" | "end";

export type ContextMenuUICloseInteraction = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

export type ContextMenuUIFinalFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interaction: ContextMenuUICloseInteraction) => boolean | HTMLElement | null | undefined);

export interface ContextMenuUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: ContextMenuUIPlacementSide;
  align?: ContextMenuUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: ContextMenuUIFinalFocus;
}

export type ContextMenuUIItemVariant = "default" | "danger";

export interface ContextMenuUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  disabled?: boolean;
  label?: string;
  closeOnSelect?: boolean;
  variant?: ContextMenuUIItemVariant;
}

export interface ContextMenuUICheckboxItemProps extends Omit<ContextMenuUIItemProps, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: ContextMenuUIChangeDetails) => void;
}

export interface ContextMenuUIRadioGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string, details: ContextMenuUIChangeDetails) => void;
}

export interface ContextMenuUIRadioItemProps extends ContextMenuUIItemProps {
  value: string;
}

export interface ContextMenuUISeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  orientation?: "horizontal" | "vertical";
}

export type ContextMenuUISubmenuProps = ContextMenuUIProps;

export interface ContextMenuUISubmenuTriggerProps
  extends Omit<ContextMenuUIItemProps, "closeOnSelect"> {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}
