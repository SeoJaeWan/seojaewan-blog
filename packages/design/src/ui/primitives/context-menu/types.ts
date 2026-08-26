import type { Ref } from "react";

export type PresenceState = "unmounted" | "entering" | "present" | "exiting";

export type FocusRestoration = "trigger" | "previous" | "none";

export type ScreenCoordinate = Readonly<{
  x: number;
  y: number;
}>;

type ControlledOpenState = Readonly<{
  defaultOpen?: never;
  open: boolean;
}>;

type UncontrolledOpenState = Readonly<{
  defaultOpen?: boolean;
  open?: never;
}>;

export type ContextMenuCloseReason =
  "escape-key" | "outside-press" | "item-action" | "replaced" | "programmatic";

export type ContextMenuOpenChange = Readonly<
  | {
      open: true;
      reason: "coordinate-request" | "trigger";
    }
  | {
      open: false;
      reason: ContextMenuCloseReason;
    }
>;

type ContextMenuItemBase = Readonly<{
  disabled?: boolean;
  id: string;
  label: string;
}>;

export type ContextMenuActionItem = ContextMenuItemBase &
  Readonly<{
    kind: "action";
  }>;

export type ContextMenuCheckboxItem = ContextMenuItemBase &
  Readonly<{
    checked: boolean;
    kind: "checkbox";
    onCheckedChange?: (checked: boolean) => void;
  }>;

export type ContextMenuRadioItem = ContextMenuItemBase &
  Readonly<{
    checked: boolean;
    groupId: string;
    kind: "radio";
  }>;

export type ContextMenuSeparator = Readonly<{
  id: string;
  kind: "separator";
}>;

export type ContextMenuSubmenuItem = ContextMenuItemBase &
  Readonly<{
    items: readonly ContextMenuItem[];
    kind: "submenu";
  }>;

export type ContextMenuItem =
  | ContextMenuActionItem
  | ContextMenuCheckboxItem
  | ContextMenuRadioItem
  | ContextMenuSeparator
  | ContextMenuSubmenuItem;

export type ContextMenuController = Readonly<{
  close: (reason: "programmatic" | "replaced") => void;
  openAt: (coordinate: ScreenCoordinate) => void;
}>;

type ContextMenuCommonProps = Readonly<{
  anchor?: ScreenCoordinate;
  controllerRef?: Ref<ContextMenuController>;
  focusRestoration?: FocusRestoration;
  items: readonly ContextMenuItem[];
  onAction?: (itemId: string) => void;
  onOpenChange?: (change: ContextMenuOpenChange) => void;
  onPresenceChange?: (state: PresenceState) => void;
  onRestoreFocus?: () => void;
  triggerLabel: string;
}>;

export type ContextMenuProps = ContextMenuCommonProps &
  (ControlledOpenState | UncontrolledOpenState);
