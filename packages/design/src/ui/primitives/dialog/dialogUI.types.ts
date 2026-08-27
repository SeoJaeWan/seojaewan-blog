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

/** Project-owned context for a DialogUI open-state transition. */
export interface DialogUIOpenChangeDetails {
  /** Stable reason that does not expose the underlying primitive event. */
  reason: DialogUIOpenChangeReason;
}

/**
 * Controls a modal surface that isolates focus from the page behind it.
 *
 * DialogUI does not own business confirmation, persistence, or application
 * navigation. Use PopoverUI for anchored, non-modal supplementary content.
 */
export interface DialogUIProps {
  children?: ReactNode;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Prevents pointer interaction outside the dialog from dismissing it. */
  disablePointerDismissal?: boolean;
  /** Current open state for controlled usage. */
  open?: boolean;
  /** Reports project-owned open and dismiss reasons. */
  onOpenChange?: (open: boolean, details: DialogUIOpenChangeDetails) => void;
  /** Runs after the open or close transition has completed. */
  onOpenChangeComplete?: (open: boolean) => void;
}

/** Props for the visible control that opens DialogUI. */
export interface DialogUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

/** Props for the layer that portals a DialogUI above application content. */
export interface DialogUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

/** Props for the visual layer behind modal DialogUI.Content. */
export type DialogUIBackdropProps = HTMLAttributes<HTMLDivElement>;

/**
 * Props for the modal surface that owns focus isolation.
 * This part does not decide whether a business operation may be completed.
 */
export interface DialogUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

/** Props for the heading that labels DialogUI.Content. */
export type DialogUITitleProps = HTMLAttributes<HTMLHeadingElement>;
/** Props for supporting text that describes DialogUI.Content. */
export type DialogUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** Props for an action that dismisses its owning DialogUI. */
export interface DialogUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
