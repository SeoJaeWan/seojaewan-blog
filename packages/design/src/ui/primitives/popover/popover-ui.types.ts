import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

export type PopoverUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export type PopoverUIPlacementAlign = "start" | "center" | "end";

export type PopoverUIOpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

export interface PopoverUIOpenChangeDetails {
  reason: PopoverUIOpenChangeReason;
  event: Event;
  trigger: Element | undefined;
}

export interface PopoverUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: PopoverUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** Enables modal focus and pointer behavior. The default popover is non-modal. */
  modal?: boolean;
}

export interface PopoverUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface PopoverUIContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: PopoverUIPlacementAlign;
  alignOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
  keepMounted?: boolean;
  side?: PopoverUIPlacementSide;
  sideOffset?: number;
}

export type PopoverUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type PopoverUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface PopoverUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
