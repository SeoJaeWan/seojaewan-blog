import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

export type SheetUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-watcher"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "swipe"
  | "none";

export interface SheetUIOpenChangeDetails {
  reason: SheetUIOpenChangeReason;
}

/**
 * A modal bottom sheet. Snap-point props are intentionally absent while the project uses
 * Base UI 1.7.0; the public contract supports open/closed placement only.
 */
export interface SheetUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: SheetUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface SheetUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface SheetUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type SheetUIBackdropProps = HTMLAttributes<HTMLDivElement>;
export type SheetUIViewportProps = HTMLAttributes<HTMLDivElement>;

export interface SheetUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type SheetUIHandleProps = HTMLAttributes<HTMLDivElement>;
export type SheetUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type SheetUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface SheetUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
