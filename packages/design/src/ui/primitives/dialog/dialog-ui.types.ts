import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

export type DialogUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

export interface DialogUIOpenChangeDetails {
  reason: DialogUIOpenChangeReason;
}

export interface DialogUIProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  disablePointerDismissal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details: DialogUIOpenChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export interface DialogUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

export interface DialogUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

export type DialogUIBackdropProps = HTMLAttributes<HTMLDivElement>;

export interface DialogUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

export type DialogUITitleProps = HTMLAttributes<HTMLHeadingElement>;
export type DialogUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export interface DialogUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
