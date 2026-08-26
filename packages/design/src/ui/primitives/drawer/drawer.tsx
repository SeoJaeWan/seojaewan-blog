import { useId, useRef, useState } from "react";

import { Drawer as ProviderDrawer } from "@base-ui/react/drawer";

import type { FocusRestoration } from "../context-menu/types";
import { usePresenceNotifications } from "./presence";
import type { DrawerCloseReason, DrawerPlacement, DrawerProps } from "./types";

const translateCloseReason = (reason: string): DrawerCloseReason => {
  switch (reason) {
    case "escape-key":
    case "close-watcher":
      return "escape-key";
    case "outside-press":
    case "focus-out":
      return "outside-press";
    case "close-press":
    case "swipe":
      return "action";
    default:
      return "programmatic";
  }
};

const swipeDirectionByPlacement: Record<DrawerPlacement, "down" | "left" | "right"> = {
  bottom: "down",
  left: "left",
  right: "right",
};

const resolveFinalFocus = (
  focusRestoration: FocusRestoration,
  previousFocusRef: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  onRestoreFocus: DrawerProps["onRestoreFocus"],
) => {
  if (focusRestoration === "none") {
    return false;
  }

  return () => {
    onRestoreFocus?.();
    return focusRestoration === "previous" ? previousFocusRef.current : triggerRef.current;
  };
};

export const Drawer = (props: DrawerProps) => {
  const {
    children,
    description,
    focusRestoration = "trigger",
    onOpenChange,
    onPresenceChange,
    onRestoreFocus,
    placement,
    title,
    triggerLabel,
  } = props;
  const controlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(props.defaultOpen ?? false);
  const open = controlled ? props.open : uncontrolledOpen;
  const triggerId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const notifyPresenceComplete = usePresenceNotifications(open, onPresenceChange);
  const finalFocus = resolveFinalFocus(
    focusRestoration,
    previousFocusRef,
    triggerRef,
    onRestoreFocus,
  );

  return (
    <ProviderDrawer.Root
      onOpenChange={(nextOpen, details) => {
        if (!controlled) {
          setUncontrolledOpen(nextOpen);
        }

        if (nextOpen) {
          previousFocusRef.current =
            typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
          onOpenChange?.({ open: true, reason: "trigger" });
        } else {
          onOpenChange?.({ open: false, reason: translateCloseReason(details.reason) });
        }
      }}
      onOpenChangeComplete={notifyPresenceComplete}
      open={open}
      swipeDirection={swipeDirectionByPlacement[placement]}
      triggerId={triggerId}
    >
      <ProviderDrawer.Trigger
        className="wd-drawer__trigger"
        id={triggerId}
        ref={triggerRef}
        type="button"
      >
        {triggerLabel}
      </ProviderDrawer.Trigger>
      <ProviderDrawer.Portal>
        <ProviderDrawer.Backdrop className="wd-drawer__backdrop" />
        <ProviderDrawer.Viewport className="wd-drawer__viewport">
          <ProviderDrawer.Popup
            className={`wd-drawer wd-drawer--${placement}`}
            finalFocus={finalFocus}
            initialFocus
          >
            <ProviderDrawer.Title className="wd-drawer__title">{title}</ProviderDrawer.Title>
            <ProviderDrawer.Description className="wd-drawer__description">
              {description}
            </ProviderDrawer.Description>
            <div className="wd-drawer__content">{children}</div>
            <ProviderDrawer.Close className="wd-drawer__close" type="button">
              닫기
            </ProviderDrawer.Close>
          </ProviderDrawer.Popup>
        </ProviderDrawer.Viewport>
      </ProviderDrawer.Portal>
    </ProviderDrawer.Root>
  );
};
