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

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import type {
  ContextMenuCloseReason,
  ContextMenuItem,
  ContextMenuProps,
  FocusRestoration,
  ScreenCoordinate,
} from "../../contracts";
import { usePresenceNotifications } from "./presence";

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
    <BaseContextMenu.RadioGroup key={items[0]?.groupId} value={selectedItem?.id ?? null}>
      {items.map((item) => (
        <BaseContextMenu.RadioItem
          closeOnClick
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onClick={() => onAction?.(item.id)}
          value={item.id}
        >
          <BaseContextMenu.RadioItemIndicator>✓</BaseContextMenu.RadioItemIndicator>
          {item.label}
        </BaseContextMenu.RadioItem>
      ))}
    </BaseContextMenu.RadioGroup>
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
      renderedItems.push(<BaseContextMenu.Separator key={item.id} />);
      continue;
    }

    if (item.kind === "action") {
      renderedItems.push(
        <BaseContextMenu.Item
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onClick={() => onAction?.(item.id)}
        >
          {item.label}
        </BaseContextMenu.Item>,
      );
      continue;
    }

    if (item.kind === "checkbox") {
      renderedItems.push(
        <BaseContextMenu.CheckboxItem
          checked={item.checked}
          closeOnClick
          disabled={item.disabled}
          key={item.id}
          label={item.label}
          onCheckedChange={(checked) => item.onCheckedChange?.(checked)}
          onClick={() => onAction?.(item.id)}
        >
          <BaseContextMenu.CheckboxItemIndicator>✓</BaseContextMenu.CheckboxItemIndicator>
          {item.label}
        </BaseContextMenu.CheckboxItem>,
      );
      continue;
    }

    if (item.kind === "submenu") {
      renderedItems.push(
        <BaseContextMenu.SubmenuRoot key={item.id}>
          <BaseContextMenu.SubmenuTrigger disabled={item.disabled} label={item.label} openOnHover>
            {item.label}
          </BaseContextMenu.SubmenuTrigger>
          <BaseContextMenu.Portal>
            <BaseContextMenu.Positioner side="right" align="start">
              <BaseContextMenu.Popup className="base-ui-candidate__menu">
                <ItemRenderer items={item.items} onAction={onAction} />
              </BaseContextMenu.Popup>
            </BaseContextMenu.Positioner>
          </BaseContextMenu.Portal>
        </BaseContextMenu.SubmenuRoot>,
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
  const instanceKeyRef = useRef(Symbol("base-ui-context-menu"));
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const suppressFocusRestorationRef = useRef(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
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
    <BaseContextMenu.Root
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) {
          setRequestedAnchor(undefined);
          requestOpen("trigger");
        } else {
          requestClose(translateCloseReason(details.reason));
        }
      }}
      onOpenChangeComplete={notifyPresenceComplete}
      open={open}
    >
      <BaseContextMenu.Trigger ref={triggerRef} aria-label={triggerLabel}>
        {triggerLabel}
      </BaseContextMenu.Trigger>
      <BaseContextMenu.Portal>
        <BaseContextMenu.Positioner
          align="start"
          anchor={virtualAnchor}
          positionMethod="fixed"
          side="bottom"
        >
          <BaseContextMenu.Popup className="base-ui-candidate__menu" finalFocus={finalFocus}>
            <ItemRenderer items={items} onAction={onAction} />
          </BaseContextMenu.Popup>
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    </BaseContextMenu.Root>
  );
};
