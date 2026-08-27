import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/** A predefined value and its user-facing label; application routing remains outside ComboboxUI. */
export interface ComboboxUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Project-owned reasons emitted by ComboboxUI without exposing vendor event details. */
export type ComboboxUIChangeReason =
  | "trigger-press"
  | "input-press"
  | "outside-press"
  | "item-press"
  | "close-press"
  | "escape-key"
  | "list-navigation"
  | "focus-out"
  | "input-change"
  | "input-clear"
  | "clear-press"
  | "cancel-open"
  | "none";

/** Stable change metadata owned by the design package, not by Base UI. */
export interface ComboboxUIChangeDetails {
  reason: ComboboxUIChangeReason;
}

/** Props for predefined single selection; this root does not submit arbitrary typed text. */
export interface ComboboxUIProps {
  children?: ReactNode;
  items: readonly ComboboxUIOption[];
  value?: string | null;
  defaultValue?: string | null;
  inputValue?: string;
  defaultInputValue?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  autoHighlight?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  onValueChange?: (value: string | null, details: ComboboxUIChangeDetails) => void;
  onInputValueChange?: (value: string, details: ComboboxUIChangeDetails) => void;
  onOpenChange?: (open: boolean, details: ComboboxUIChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

/** Props for the accessible field label; labeling content is supplied by the consumer. */
export interface ComboboxUILabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  ref?: Ref<HTMLLabelElement>;
}

/** Props for the input/control grouping element; it does not own selection state. */
export interface ComboboxUIInputGroupProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** Props for the filtering input; option creation and free-form submission are not supported. */
export interface ComboboxUIInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/** Props for the popup trigger; it does not perform application navigation. */
export interface ComboboxUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
}

/** Props for the clear action; it only clears primitive input and selection state. */
export interface ComboboxUIClearProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
  keepMounted?: boolean;
}

/** Supported popup placement sides, independent from the vendor type. */
export type ComboboxUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/** Supported popup alignment values, independent from the vendor type. */
export type ComboboxUIPlacementAlign = "start" | "center" | "end";

/** Props for the portalled option surface; it does not provide or mutate application data. */
export interface ComboboxUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: ComboboxUIPlacementSide;
  align?: ComboboxUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
}

/** Props for the listbox container; filtering is owned by the root's predefined items. */
export interface ComboboxUIListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  ref?: Ref<HTMLDivElement>;
  renderItem?: (option: ComboboxUIOption) => ReactNode;
}

/** Props for one predefined option; it cannot introduce a value absent from the root items. */
export interface ComboboxUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  value: string;
  disabled?: boolean;
}

/** Props for the polite empty-result message; it does not alter filtering. */
export interface ComboboxUIEmptyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}
