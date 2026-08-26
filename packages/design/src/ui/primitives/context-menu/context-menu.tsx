import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { ContextMenu as ProviderContextMenu } from "@base-ui/react/context-menu";

import { usePresenceNotifications } from "./presence";
import type {
  ContextMenuCloseReason,
  ContextMenuItem,
  ContextMenuProps,
  FocusRestoration,
  ScreenCoordinate,
} from "./types";

type ActiveContextMenu = Readonly<{
  closeForReplacement: () => void;
  key: symbol;
  restoreFocusTarget: HTMLElement | null;
}>;

let activeContextMenu: ActiveContextMenu | undefined;

const translateCloseReason = (reason: string): ContextMenuCloseReason => {
  switch (reason) {
    case "escape-key":
      return "escape-key";
    case "outside-press":
    case "focus-out":
      return "outside-press";
    case "item-press":
    case "close-press":
      return "item-action";
    case "sibling-open":
      return "replaced";
    default:
      return "programmatic";
  }
};

const createVirtualAnchor = ({ x, y }: ScreenCoordinate) => ({
  getBoundingClientRect: () => ({
    bottom: y,
    height: 0,
    left: x,
    right: x,
    top: y,
    width: 0,
    x,
    y,
  }),
});

type ItemRendererProps = Readonly<{
  items: readonly ContextMenuItem[];
  onAction?: (itemId: string) => void;
}>;

const renderRadioGroup = (
  items: readonly Extract<ContextMenuItem, { kind: "radio" }>[],
  onAction: ItemRendererProps["onAction"],
) => {
  const selectedItem = items.find(({ checked }) => checked);

  return (
    <ProviderContextMenu.RadioGroup key={items[0]?.groupId} value={selectedItem?.id ?? null}>
      {items.map((item) => (
        <ProviderContextMenu.RadioItem
          className="wd-context-menu__item wd-context-menu__item--radio"
          closeOnClick
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onClick={() => onAction?.(item.id)}
          value={item.id}
        >
          <ProviderContextMenu.RadioItemIndicator className="wd-context-menu__indicator">
            ✓
          </ProviderContextMenu.RadioItemIndicator>
          {item.label}
        </ProviderContextMenu.RadioItem>
      ))}
    </ProviderContextMenu.RadioGroup>
  );
};

const ItemRenderer = ({ items, onAction }: ItemRendererProps) => {
  const renderedItems: ReactNode[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (!item) {
      continue;
    }

    if (item.kind === "separator") {
      renderedItems.push(
        <ProviderContextMenu.Separator className="wd-context-menu__separator" key={item.id} />,
      );
      continue;
    }

    if (item.kind === "action") {
      renderedItems.push(
        <ProviderContextMenu.Item
          className="wd-context-menu__item"
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onClick={() => onAction?.(item.id)}
        >
          {item.label}
        </ProviderContextMenu.Item>,
      );
      continue;
    }

    if (item.kind === "checkbox") {
      renderedItems.push(
        <ProviderContextMenu.CheckboxItem
          checked={item.checked}
          className="wd-context-menu__item wd-context-menu__item--checkbox"
          closeOnClick
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onCheckedChange={(checked) => item.onCheckedChange?.(checked)}
          onClick={() => onAction?.(item.id)}
        >
          <ProviderContextMenu.CheckboxItemIndicator className="wd-context-menu__indicator">
            ✓
          </ProviderContextMenu.CheckboxItemIndicator>
          {item.label}
        </ProviderContextMenu.CheckboxItem>,
      );
      continue;
    }

    if (item.kind === "submenu") {
      renderedItems.push(
        <ProviderContextMenu.SubmenuRoot key={item.id}>
          <ProviderContextMenu.SubmenuTrigger
            className="wd-context-menu__item wd-context-menu__item--submenu"
            disabled={item.disabled}
            label={item.label}
            openOnHover
          >
            {item.label}
          </ProviderContextMenu.SubmenuTrigger>
          <ProviderContextMenu.Portal>
            <ProviderContextMenu.Positioner side="right" align="start">
              <ProviderContextMenu.Popup className="wd-context-menu">
                <ItemRenderer items={item.items} onAction={onAction} />
              </ProviderContextMenu.Popup>
            </ProviderContextMenu.Positioner>
          </ProviderContextMenu.Portal>
        </ProviderContextMenu.SubmenuRoot>,
      );
      continue;
    }

    const groupItems = [item];
    let nextItem = items[index + 1];

    while (nextItem?.kind === "radio" && nextItem.groupId === item.groupId) {
      groupItems.push(nextItem);
      index += 1;
      nextItem = items[index + 1];
    }

    renderedItems.push(renderRadioGroup(groupItems, onAction));
  }

  return <Fragment>{renderedItems}</Fragment>;
};

const resolveFinalFocus = (
  focusRestoration: FocusRestoration,
  previousFocusRef: React.RefObject<HTMLElement | null>,
  suppressFocusRestorationRef: React.RefObject<boolean>,
  triggerRef: React.RefObject<HTMLDivElement | null>,
  onRestoreFocus: ContextMenuProps["onRestoreFocus"],
) => {
  if (focusRestoration === "none") {
    return false;
  }

  return () => {
    if (suppressFocusRestorationRef.current) {
      suppressFocusRestorationRef.current = false;
      return false;
    }

    onRestoreFocus?.();
    return focusRestoration === "previous" ? previousFocusRef.current : triggerRef.current;
  };
};

export const ContextMenu = (props: ContextMenuProps) => {
  const {
    anchor,
    controllerRef,
    focusRestoration = "trigger",
    items,
    onAction,
    onOpenChange,
    onPresenceChange,
    onRestoreFocus,
    triggerLabel,
  } = props;
  const controlled = props.open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(props.defaultOpen ?? false);
  const [requestedAnchor, setRequestedAnchor] = useState<ScreenCoordinate>();
  const open = controlled ? props.open : uncontrolledOpen;
  const instanceKeyRef = useRef(Symbol("wd-context-menu"));
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const suppressFocusRestorationRef = useRef(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const vendorCloseReasonRef = useRef<ContextMenuCloseReason | undefined>(undefined);
  const notifyPresenceComplete = usePresenceNotifications(open, onPresenceChange);

  const requestClose = useCallback(
    (reason: ContextMenuCloseReason) => {
      if (activeContextMenu?.key === instanceKeyRef.current) {
        activeContextMenu = undefined;
      }

      if (!controlled) {
        setUncontrolledOpen(false);
      }

      onOpenChange?.({ open: false, reason });
    },
    [controlled, onOpenChange],
  );

  const claimActiveMenu = useCallback(() => {
    const key = instanceKeyRef.current;
    const replacedMenu = activeContextMenu?.key === key ? undefined : activeContextMenu;

    if (replacedMenu) {
      replacedMenu.closeForReplacement();
      previousFocusRef.current = replacedMenu.restoreFocusTarget;
    }

    if (activeContextMenu?.key !== key) {
      activeContextMenu = {
        closeForReplacement: () => {
          suppressFocusRestorationRef.current = true;
          requestClose("replaced");
        },
        key,
        restoreFocusTarget: previousFocusRef.current,
      };
    }
  }, [requestClose]);

  const requestOpen = useCallback(
    (reason: "coordinate-request" | "trigger") => {
      previousFocusRef.current =
        typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
      claimActiveMenu();

      if (!controlled) {
        setUncontrolledOpen(true);
      }

      onOpenChange?.({ open: true, reason });
    },
    [claimActiveMenu, controlled, onOpenChange],
  );

  useImperativeHandle(
    controllerRef,
    () => ({
      close: (reason) => {
        if (reason === "replaced") {
          suppressFocusRestorationRef.current = true;
        }

        requestClose(reason);
      },
      openAt: (coordinate) => {
        setRequestedAnchor(coordinate);
        requestOpen("coordinate-request");
      },
    }),
    [requestClose, requestOpen],
  );

  useEffect(() => {
    const instanceKey = instanceKeyRef.current;

    if (open) {
      claimActiveMenu();
    }

    return () => {
      if (activeContextMenu?.key === instanceKey) {
        activeContextMenu = undefined;
      }
    };
  }, [claimActiveMenu, open]);

  const coordinate = requestedAnchor ?? anchor;
  const virtualAnchor = useMemo(
    () => (coordinate ? createVirtualAnchor(coordinate) : undefined),
    [coordinate],
  );
  const finalFocus = resolveFinalFocus(
    focusRestoration,
    previousFocusRef,
    suppressFocusRestorationRef,
    triggerRef,
    onRestoreFocus,
  );

  return (
    <ProviderContextMenu.Root
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) {
          setRequestedAnchor(undefined);
          requestOpen("trigger");
          return;
        }

        const closeReason = translateCloseReason(details.reason);

        if (vendorCloseReasonRef.current === closeReason) {
          return;
        }

        vendorCloseReasonRef.current = closeReason;
        queueMicrotask(() => {
          if (vendorCloseReasonRef.current === closeReason) {
            vendorCloseReasonRef.current = undefined;
          }
        });
        requestClose(closeReason);
      }}
      onOpenChangeComplete={notifyPresenceComplete}
      open={open}
    >
      <ProviderContextMenu.Trigger
        aria-label={triggerLabel}
        className="wd-context-menu__trigger"
        ref={triggerRef}
      >
        {triggerLabel}
      </ProviderContextMenu.Trigger>
      <ProviderContextMenu.Portal>
        <ProviderContextMenu.Positioner
          align="start"
          anchor={virtualAnchor}
          positionMethod="fixed"
          side="bottom"
        >
          <ProviderContextMenu.Popup className="wd-context-menu" finalFocus={finalFocus}>
            <ItemRenderer items={items} onAction={onAction} />
          </ProviderContextMenu.Popup>
        </ProviderContextMenu.Positioner>
      </ProviderContextMenu.Portal>
    </ProviderContextMenu.Root>
  );
};
