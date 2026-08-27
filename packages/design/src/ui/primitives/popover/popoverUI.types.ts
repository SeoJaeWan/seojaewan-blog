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

/** Project-owned context for a PopoverUI open-state transition. */
export interface PopoverUIOpenChangeDetails {
  /** Stable reason that does not expose the underlying primitive event. */
  reason: PopoverUIOpenChangeReason;
}

/**
 * Controls an anchored, non-modal supplementary surface.
 *
 * PopoverUI does not isolate focus or own application state. Use DialogUI when
 * interaction with the rest of the page must be blocked.
 */
export interface PopoverUIProps {
  children?: ReactNode;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Current open state for controlled usage. */
  open?: boolean;
  /** Reports project-owned open and dismiss reasons. */
  onOpenChange?: (open: boolean, details: PopoverUIOpenChangeDetails) => void;
  /** Runs after the open or close transition has completed. */
  onOpenChangeComplete?: (open: boolean) => void;
}

/** Props for the visible control that anchors and toggles PopoverUI. */
export interface PopoverUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining trigger behavior. */
  render?: ReactElement;
}

/**
 * Props for the portalled surface positioned against PopoverUI.Trigger.
 * This part does not provide modal focus isolation.
 */
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

/** Props for the heading that labels PopoverUI.Content. */
export type PopoverUITitleProps = HTMLAttributes<HTMLHeadingElement>;
/** Props for supporting text that describes PopoverUI.Content. */
export type PopoverUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** Props for an action that dismisses its owning PopoverUI. */
export interface PopoverUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replaces the native button while retaining close behavior. */
  render?: ReactElement;
}
