import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import * as RadixContextMenu from "@radix-ui/react-context-menu";

import type {
  ContextMenuCloseReason,
  ContextMenuController,
  ContextMenuItem,
  ContextMenuProps,
  FocusRestoration,
  ScreenCoordinate,
} from "../../contracts";
import { usePresenceNotifications } from "./presence";

type ActiveMenu = Readonly<{
  closeAsReplaced: () => void;
  id: symbol;
}>;

let activeMenu: ActiveMenu | undefined;

const activateMenu = (menu: ActiveMenu) => {
  if (activeMenu && activeMenu.id !== menu.id) {
    activeMenu.closeAsReplaced();
  }

  activeMenu = menu;
};

const releaseMenu = (id: symbol) => {
  if (activeMenu?.id === id) {
    activeMenu = undefined;
  }
};

type MenuItemsProps = Readonly<{
  items: readonly ContextMenuItem[];
  onAction?: (itemId: string) => void;
  setCloseReason: (reason: ContextMenuCloseReason) => void;
}>;

const MenuItems = ({ items, onAction, setCloseReason }: MenuItemsProps) => {
  const renderedRadioGroups = new Set<string>();

  return items.map((item) => {
    if (item.kind === "separator") {
      return <RadixContextMenu.Separator key={item.id} className="radix-candidate__separator" />;
    }

    if (item.kind === "submenu") {
      return (
        <RadixContextMenu.Sub key={item.id}>
          <RadixContextMenu.SubTrigger
            className="radix-candidate__menu-item"
            disabled={item.disabled}
          >
            {item.label}
            <span aria-hidden="true">›</span>
          </RadixContextMenu.SubTrigger>
          <RadixContextMenu.Portal>
            <RadixContextMenu.SubContent className="radix-candidate__menu-content">
              <MenuItems items={item.items} onAction={onAction} setCloseReason={setCloseReason} />
            </RadixContextMenu.SubContent>
          </RadixContextMenu.Portal>
        </RadixContextMenu.Sub>
      );
    }

    if (item.kind === "checkbox") {
      return (
        <RadixContextMenu.CheckboxItem
          checked={item.checked}
          className="radix-candidate__menu-item"
          disabled={item.disabled}
          key={item.id}
          onCheckedChange={(checked) => item.onCheckedChange?.(checked === true)}
          onSelect={() => {
            setCloseReason("item-action");
            onAction?.(item.id);
          }}
        >
          <RadixContextMenu.ItemIndicator>✓</RadixContextMenu.ItemIndicator>
          {item.label}
        </RadixContextMenu.CheckboxItem>
      );
    }

    if (item.kind === "radio") {
      if (renderedRadioGroups.has(item.groupId)) {
        return null;
      }

      renderedRadioGroups.add(item.groupId);
      const groupItems = items.filter(
        (candidate): candidate is Extract<ContextMenuItem, { kind: "radio" }> =>
          candidate.kind === "radio" && candidate.groupId === item.groupId,
      );
      const selected = groupItems.find(({ checked }) => checked)?.id;

      return (
        <RadixContextMenu.RadioGroup key={item.groupId} value={selected}>
          {groupItems.map((radioItem) => (
            <RadixContextMenu.RadioItem
              className="radix-candidate__menu-item"
              disabled={radioItem.disabled}
              key={radioItem.id}
              onSelect={() => {
                setCloseReason("item-action");
                onAction?.(radioItem.id);
              }}
              value={radioItem.id}
            >
              <RadixContextMenu.ItemIndicator>●</RadixContextMenu.ItemIndicator>
              {radioItem.label}
            </RadixContextMenu.RadioItem>
          ))}
        </RadixContextMenu.RadioGroup>
      );
    }

    return (
      <RadixContextMenu.Item
        className="radix-candidate__menu-item"
        disabled={item.disabled}
        key={item.id}
        onSelect={() => {
          setCloseReason("item-action");
          onAction?.(item.id);
        }}
      >
        {item.label}
      </RadixContextMenu.Item>
    );
  });
};

const restoreFocus = (
  focusRestoration: FocusRestoration | undefined,
  previousFocus: HTMLElement | null,
  trigger: HTMLButtonElement | null,
  onRestoreFocus?: () => void,
) => {
  if (focusRestoration === "none") {
    return;
  }

  if (focusRestoration === "previous") {
    previousFocus?.focus();
  } else {
    trigger?.focus();
  }

  onRestoreFocus?.();
};

export const ContextMenu = ({
  anchor,
  controllerRef,
  defaultOpen = false,
  focusRestoration = "trigger",
  items,
  onAction,
  onOpenChange,
  onPresenceChange,
  onRestoreFocus,
  open,
  triggerLabel,
}: ContextMenuProps) => {
  const controlled = open !== undefined;
  const requestedOpen = open ?? defaultOpen;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [suppressed, setSuppressed] = useState(false);
  const menuId = useRef(Symbol("radix-context-menu"));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeReason = useRef<ContextMenuCloseReason>("programmatic");
  const ignoreNextRadixOpen = useRef(false);
  const effectiveOpen = (controlled ? requestedOpen : uncontrolledOpen) && !suppressed;

  usePresenceNotifications(effectiveOpen, onPresenceChange);

  const close = useCallback(
    (reason: ContextMenuCloseReason) => {
      closeReason.current = reason;
      releaseMenu(menuId.current);
      setSuppressed(reason === "replaced");

      if (!controlled) {
        setUncontrolledOpen(false);
      }

      onOpenChange?.({ open: false, reason });
    },
    [controlled, onOpenChange],
  );

  const menuRegistration = useRef<ActiveMenu>({
    closeAsReplaced: () => undefined,
    id: menuId.current,
  });
  menuRegistration.current = {
    closeAsReplaced: () => close("replaced"),
    id: menuId.current,
  };

  const requestOpen = useCallback(
    (reason: "coordinate-request" | "trigger") => {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setSuppressed(false);
      activateMenu(menuRegistration.current);

      if (!controlled) {
        setUncontrolledOpen(true);
      }

      onOpenChange?.({ open: true, reason });
    },
    [controlled, onOpenChange],
  );

  const openAt = useCallback(
    (coordinate: ScreenCoordinate) => {
      requestOpen("coordinate-request");
      ignoreNextRadixOpen.current = true;
      triggerRef.current?.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          clientX: coordinate.x,
          clientY: coordinate.y,
        }),
      );
    },
    [requestOpen],
  );

  useImperativeHandle<ContextMenuController, ContextMenuController>(
    controllerRef,
    () => ({
      close: (reason) => close(reason),
      openAt,
    }),
    [close, openAt],
  );

  useEffect(() => {
    if (requestedOpen) {
      setSuppressed(false);
      activateMenu(menuRegistration.current);
    } else {
      releaseMenu(menuId.current);
      setSuppressed(false);
    }
  }, [requestedOpen]);

  useEffect(
    () => () => {
      releaseMenu(menuId.current);
    },
    [],
  );

  useEffect(() => {
    if (!effectiveOpen || !anchor) {
      return;
    }

    triggerRef.current?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        clientX: anchor.x,
        clientY: anchor.y,
      }),
    );
  }, [anchor, effectiveOpen]);

  return (
    <RadixContextMenu.Root
      modal
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          if (ignoreNextRadixOpen.current) {
            ignoreNextRadixOpen.current = false;
          } else {
            requestOpen("trigger");
          }
        } else {
          close(closeReason.current);
        }
      }}
      open={effectiveOpen}
    >
      <RadixContextMenu.Trigger asChild>
        <button
          aria-label={triggerLabel}
          onContextMenuCapture={() => {
            closeReason.current = "outside-press";
            previousFocus.current = document.activeElement as HTMLElement | null;
          }}
          ref={triggerRef}
          type="button"
        >
          {triggerLabel}
        </button>
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          aria-label={triggerLabel}
          className="radix-candidate__menu-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();

            if (closeReason.current === "replaced") {
              return;
            }

            restoreFocus(
              focusRestoration,
              previousFocus.current,
              triggerRef.current,
              onRestoreFocus,
            );
          }}
          onEscapeKeyDown={() => {
            closeReason.current = "escape-key";
          }}
          onPointerDownOutside={() => {
            closeReason.current = "outside-press";
          }}
        >
          <MenuItems
            items={items}
            onAction={onAction}
            setCloseReason={(reason) => (closeReason.current = reason)}
          />
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
};
