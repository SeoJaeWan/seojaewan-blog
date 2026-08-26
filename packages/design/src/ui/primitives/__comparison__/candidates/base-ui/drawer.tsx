import { useId, useRef, useState } from "react";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";

import type {
  DrawerCloseReason,
  DrawerPlacement,
  DrawerProps,
  FocusRestoration,
} from "../../contracts";
import { usePresenceNotifications } from "./presence";

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
    <BaseDrawer.Root
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
      <BaseDrawer.Trigger id={triggerId} ref={triggerRef} type="button">
        {triggerLabel}
      </BaseDrawer.Trigger>
      <BaseDrawer.Portal>
        <BaseDrawer.Backdrop className="base-ui-candidate__drawer-backdrop" />
        <BaseDrawer.Viewport className="base-ui-candidate__drawer-viewport">
          <BaseDrawer.Popup
            className={`base-ui-candidate__drawer base-ui-candidate__drawer--${placement}`}
            finalFocus={finalFocus}
            initialFocus
          >
            <BaseDrawer.Title>{title}</BaseDrawer.Title>
            <BaseDrawer.Description>{description}</BaseDrawer.Description>
            {children}
            <BaseDrawer.Close type="button">닫기</BaseDrawer.Close>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
};
