import type { ReactNode } from "react";

import type { FocusRestoration, PresenceState } from "../context-menu/types";

type ControlledOpenState = Readonly<{
  defaultOpen?: never;
  open: boolean;
}>;

type UncontrolledOpenState = Readonly<{
  defaultOpen?: boolean;
  open?: never;
}>;

export type DrawerCloseReason = "escape-key" | "outside-press" | "action" | "programmatic";

export type DrawerOpenChange = Readonly<
  | {
      open: true;
      reason: "trigger" | "programmatic";
    }
  | {
      open: false;
      reason: DrawerCloseReason;
    }
>;

export type DrawerPlacement = "left" | "right" | "bottom";

type DrawerCommonProps = Readonly<{
  children?: ReactNode;
  description: string;
  focusRestoration?: FocusRestoration;
  onOpenChange?: (change: DrawerOpenChange) => void;
  onPresenceChange?: (state: PresenceState) => void;
  onRestoreFocus?: () => void;
  placement: DrawerPlacement;
  title: string;
  triggerLabel: string;
}>;

export type DrawerProps = DrawerCommonProps & (ControlledOpenState | UncontrolledOpenState);
