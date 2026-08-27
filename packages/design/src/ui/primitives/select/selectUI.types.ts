import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/** A predefined value and label; application tag persistence remains outside SelectUI. */
export interface SelectUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Project-owned change reasons, including the adapter's explicit clear action. */
export type SelectUIChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "window-resize"
  | "item-press"
  | "focus-out"
  | "list-navigation"
  | "cancel-open"
  | "clear-press"
  | "none";

/** Stable SelectUI change metadata that does not expose vendor event details. */
export interface SelectUIChangeDetails {
  reason: SelectUIChangeReason;
}

/** Props for input-free predefined single selection; multi-tag editing is intentionally excluded. */
export interface SelectUIProps {
  children?: ReactNode;
  items: readonly SelectUIOption[];
  value?: string | null;
  defaultValue?: string | null;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  modal?: boolean;
  onValueChange?: (value: string | null, details: SelectUIChangeDetails) => void;
  onOpenChange?: (open: boolean, details: SelectUIChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

/** Props for the accessible field label; labeling content remains consumer-owned. */
export interface SelectUILabelProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** Props for the input-free selection trigger; it does not own selected business data. */
export interface SelectUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
}

/** Props for the selected label; formatting does not change the stored selection. */
export interface SelectUIValueProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  placeholder?: ReactNode;
}

/** Props for clearing a selection; the action does not remove predefined items. */
export interface SelectUIClearProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/** Supported popup placement sides, independent from the vendor type. */
export type SelectUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/** Supported popup alignment values, independent from the vendor type. */
export type SelectUIPlacementAlign = "start" | "center" | "end";

/** Props for the portalled option surface; it does not provide application tag data. */
export interface SelectUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: SelectUIPlacementSide;
  align?: SelectUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
}

/** Props for the listbox container; it does not own selection state. */
export interface SelectUIListProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** Props for one predefined option; it cannot create or persist application tags. */
export interface SelectUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLElement>;
  value: string;
  label?: string;
  disabled?: boolean;
}
