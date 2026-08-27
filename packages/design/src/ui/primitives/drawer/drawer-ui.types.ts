import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

export type DrawerUIPlacement = "left" | "right";

export type DrawerUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-watcher"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "swipe"
  | "none";

export interface DrawerUIOpenChangeDetails {
  reason: DrawerUIOpenChangeReason;
}

export interface DrawerUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: DrawerUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  placement?: DrawerUIPlacement;
}

export interface DrawerUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface DrawerUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type DrawerUIBackdropProps = HTMLAttributes<HTMLDivElement>;
export type DrawerUIViewportProps = HTMLAttributes<HTMLDivElement>;

export interface DrawerUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type DrawerUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type DrawerUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface DrawerUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
