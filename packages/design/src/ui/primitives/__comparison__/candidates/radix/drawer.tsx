import { useCallback, useRef, useState } from "react";

import * as RadixDialog from "@radix-ui/react-dialog";

import type { DrawerCloseReason, DrawerProps } from "../../contracts";
import { usePresenceNotifications } from "./presence";

export const Drawer = ({
  children,
  defaultOpen = false,
  description,
  focusRestoration = "trigger",
  onOpenChange,
  onPresenceChange,
  onRestoreFocus,
  open,
  placement,
  title,
  triggerLabel,
}: DrawerProps) => {
  const controlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const effectiveOpen = controlled ? open : uncontrolledOpen;
  const closeReason = useRef<DrawerCloseReason>("programmatic");
  const previousFocus = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  usePresenceNotifications(effectiveOpen, onPresenceChange);

  const setOpen = useCallback(
    (nextOpen: boolean, reason: "trigger" | DrawerCloseReason) => {
      if (!controlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(
        nextOpen
          ? { open: true, reason: reason === "programmatic" ? "programmatic" : "trigger" }
          : { open: false, reason: reason as DrawerCloseReason },
      );
    },
    [controlled, onOpenChange],
  );

  return (
    <RadixDialog.Root
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          previousFocus.current = document.activeElement as HTMLElement | null;
          setOpen(true, "trigger");
        } else {
          setOpen(false, closeReason.current);
        }
      }}
      open={effectiveOpen}
    >
      <RadixDialog.Trigger asChild>
        <button ref={triggerRef} type="button">
          {triggerLabel}
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="radix-candidate__drawer-overlay" />
        <RadixDialog.Content
          className={`radix-candidate__drawer radix-candidate__drawer--${placement}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();

            if (focusRestoration === "previous") {
              previousFocus.current?.focus();
            } else if (focusRestoration === "trigger") {
              triggerRef.current?.focus();
            }

            if (focusRestoration !== "none") {
              onRestoreFocus?.();
            }
          }}
          onEscapeKeyDown={() => {
            closeReason.current = "escape-key";
          }}
          onPointerDownOutside={() => {
            closeReason.current = "outside-press";
          }}
        >
          <RadixDialog.Title>{title}</RadixDialog.Title>
          <RadixDialog.Description>{description}</RadixDialog.Description>
          <div className="radix-candidate__drawer-body">{children}</div>
          <RadixDialog.Close asChild>
            <button
              onClick={() => {
                closeReason.current = "action";
              }}
              type="button"
            >
              닫기
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
