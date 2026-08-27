import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

export type TooltipUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

export type TooltipUIPlacementAlign = "start" | "center" | "end";

export type TooltipUIOpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "disabled"
  | "imperative-action"
  | "none";

export interface TooltipUIOpenChangeDetails {
  reason: TooltipUIOpenChangeReason;
  event: Event;
  trigger: Element | undefined;
}

export interface TooltipUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  delay?: number;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: TooltipUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface TooltipUIGroupProps {
  children?: ReactNode;
  closeDelay?: number;
  delay?: number;
  timeout?: number;
}

export interface TooltipUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  closeDelay?: number;
  closeOnClick?: boolean;
  delay?: number;
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface TooltipUIContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: TooltipUIPlacementAlign;
  alignOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
  side?: TooltipUIPlacementSide;
  sideOffset?: number;
}
