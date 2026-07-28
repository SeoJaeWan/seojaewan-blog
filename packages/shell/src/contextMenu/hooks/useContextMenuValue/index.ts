"use client";

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ContextMenuPosition } from "@window/ui";

import type {
  CloseContextMenuOptions,
  ContextMenuContextValue,
  ContextMenuOpenRequest,
} from "../../context";
import type {
  AnyContextMenuEntry,
  ContextMenuActionEntry,
  ContextMenuCloseReason,
} from "../../types";
import { resolveContextMenuPosition } from "../../utils/resolveContextMenuPosition";

const encodeSubmenuPath = (path: readonly string[]) => JSON.stringify(path);

const readSubmenuPath = (value: string | undefined): readonly string[] =>
  value === undefined ? [] : (JSON.parse(value) as readonly string[]);

const getDirectMenuItems = (menu: HTMLElement): HTMLElement[] => {
  const items: HTMLElement[] = [];

  for (const child of menu.children) {
    const directItem = child.matches('[role="menuitem"]')
      ? child
      : child.querySelector(':scope > [role="menuitem"]');

    if (
      directItem instanceof HTMLElement &&
      directItem.getAttribute("aria-disabled") !== "true" &&
      !("disabled" in directItem && directItem.disabled === true)
    ) {
      items.push(directItem);
    }
  }

  return items;
};

const findElementByPath = (
  root: HTMLElement,
  dataAttribute: "contextMenuSubPanelPath" | "contextMenuSubmenuPath",
  path: readonly string[],
) => {
  const encodedPath = encodeSubmenuPath(path);
  const selector =
    dataAttribute === "contextMenuSubPanelPath"
      ? "[data-context-menu-sub-panel-path]"
      : "[data-context-menu-submenu-path]";

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).find(
    (element) => element.dataset[dataAttribute] === encodedPath,
  );
};

export interface UseContextMenuValueResult {
  activeMenu: ContextMenuOpenRequest | null;
  closeSubmenusFromDepth: (depth: number) => void;
  contextValue: ContextMenuContextValue;
  entries: readonly AnyContextMenuEntry[];
  handleAction: (entry: ContextMenuActionEntry<string>) => void;
  handleBackdropPointerDown: () => void;
  handleMenuKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  openSubmenu: (path: readonly string[], focusFirstItem?: boolean) => void;
  openSubmenuPath: readonly string[];
  position: ContextMenuPosition | null;
}

/**
 * 전역 Context Menu 하나의 active request, 위치, focus, keyboard와 browser lifecycle을 관리한다.
 *
 * @returns Provider Context 값과 단일 Host를 렌더링하는 데 필요한 상태·callback
 */
export const useContextMenuValue = (): UseContextMenuValueResult => {
  const [activeMenu, setActiveMenu] = useState<ContextMenuOpenRequest | null>(null);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const [openSubmenuPath, setOpenSubmenuPath] = useState<readonly string[]>([]);
  const activeMenuRef = useRef<ContextMenuOpenRequest | null>(null);
  const focusedMenuRef = useRef<ContextMenuOpenRequest | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openSubmenuPathRef = useRef<readonly string[]>([]);
  const pendingSubmenuFocusRef = useRef<readonly string[] | null>(null);

  const close = useCallback(
    (
      reason: ContextMenuCloseReason,
      { ownerId, restoreFocus = true }: CloseContextMenuOptions = {},
    ) => {
      const currentMenu = activeMenuRef.current;

      if (currentMenu === null || (ownerId !== undefined && currentMenu.ownerId !== ownerId)) {
        return;
      }

      activeMenuRef.current = null;
      focusedMenuRef.current = null;
      openSubmenuPathRef.current = [];
      pendingSubmenuFocusRef.current = null;
      setActiveMenu(null);
      setOpenSubmenuPath([]);
      setPosition(null);
      currentMenu.onClose?.(reason);

      if (restoreFocus && currentMenu.triggerElement?.isConnected) {
        currentMenu.triggerElement.focus();
      }
    },
    [],
  );

  const open = useCallback((request: ContextMenuOpenRequest) => {
    const previousMenu = activeMenuRef.current;

    if (previousMenu !== null) {
      previousMenu.onClose?.("replaced");
    }

    activeMenuRef.current = request;
    focusedMenuRef.current = null;
    openSubmenuPathRef.current = [];
    pendingSubmenuFocusRef.current = null;
    setActiveMenu(request);
    setOpenSubmenuPath([]);
    setPosition(null);
  }, []);

  const updatePosition = useCallback(() => {
    const currentMenu = activeMenuRef.current;
    const menuElement = menuRef.current;

    if (currentMenu === null || menuElement === null) {
      return;
    }

    const menuRect = menuElement.getBoundingClientRect();

    setPosition(
      resolveContextMenuPosition({
        anchorX: currentMenu.anchorX,
        anchorY: currentMenu.anchorY,
        menuHeight: menuRect.height,
        menuWidth: menuRect.width,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, []);

  const closeSubmenusFromDepth = useCallback((depth: number) => {
    const nextPath = openSubmenuPathRef.current.slice(0, depth);

    openSubmenuPathRef.current = nextPath;
    pendingSubmenuFocusRef.current = null;
    setOpenSubmenuPath(nextPath);
  }, []);

  const openSubmenu = useCallback((path: readonly string[], focusFirstItem = false) => {
    const rootMenu = menuRef.current;
    const openPanel =
      rootMenu === null ? undefined : findElementByPath(rootMenu, "contextMenuSubPanelPath", path);

    if (
      focusFirstItem &&
      openPanel !== undefined &&
      openPanel.getAttribute("aria-hidden") !== "true"
    ) {
      getDirectMenuItems(openPanel).at(0)?.focus();
      return;
    }

    openSubmenuPathRef.current = path;
    pendingSubmenuFocusRef.current = focusFirstItem ? path : null;
    setOpenSubmenuPath(path);
  }, []);

  const handleAction = useCallback(
    (entry: ContextMenuActionEntry<string>) => {
      const currentMenu = activeMenuRef.current;

      if (currentMenu === null || entry.disabled) {
        return;
      }

      if (entry.closeOnSelect === false) {
        currentMenu.onAction(entry.id);

        if (activeMenuRef.current === currentMenu) {
          openSubmenuPathRef.current = [];
          setOpenSubmenuPath([]);
          setPosition(null);
        }

        return;
      }

      close("action", { restoreFocus: entry.restoreFocus ?? true });
      currentMenu.onAction(entry.id);
    },
    [close],
  );

  const handleBackdropPointerDown = useCallback(() => {
    close("backdrop");
  }, [close]);

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const eventTarget = event.target;

      if (!(eventTarget instanceof HTMLElement)) {
        return;
      }

      const currentMenu = eventTarget.closest<HTMLElement>('[role="menu"]');

      if (currentMenu === null) {
        return;
      }

      const items = getDirectMenuItems(currentMenu);
      const currentIndex = items.indexOf(eventTarget.closest<HTMLElement>('[role="menuitem"]')!);

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          items.at(currentIndex >= 0 ? (currentIndex + 1) % items.length : 0)?.focus();
          return;
        }
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex =
            currentIndex >= 0 ? (currentIndex - 1 + items.length) % items.length : -1;
          items.at(nextIndex)?.focus();
          return;
        }
        case "End":
          event.preventDefault();
          items.at(-1)?.focus();
          return;
        case "Home":
          event.preventDefault();
          items.at(0)?.focus();
          return;
        case "ArrowRight": {
          const submenuTrigger = eventTarget.closest<HTMLElement>(
            "[data-context-menu-submenu-path]",
          );

          if (submenuTrigger === null) {
            return;
          }

          event.preventDefault();
          openSubmenu(readSubmenuPath(submenuTrigger.dataset.contextMenuSubmenuPath), true);
          return;
        }
        case "ArrowLeft": {
          const subPanel = eventTarget.closest<HTMLElement>("[data-context-menu-sub-panel-path]");

          if (subPanel === null || menuRef.current === null) {
            return;
          }

          event.preventDefault();
          const path = readSubmenuPath(subPanel.dataset.contextMenuSubPanelPath);

          closeSubmenusFromDepth(path.length - 1);
          findElementByPath(menuRef.current, "contextMenuSubmenuPath", path)?.focus();
        }
      }
    },
    [closeSubmenusFromDepth, openSubmenu],
  );

  useLayoutEffect(() => {
    if (activeMenu === null || position !== null) {
      return;
    }

    updatePosition();
  }, [activeMenu, position, updatePosition]);

  useLayoutEffect(() => {
    if (activeMenu === null || position === null || focusedMenuRef.current === activeMenu) {
      return;
    }

    const menuElement = menuRef.current;

    if (menuElement !== null) {
      getDirectMenuItems(menuElement).at(0)?.focus();
    }

    focusedMenuRef.current = activeMenu;
  }, [activeMenu, position]);

  useLayoutEffect(() => {
    const pendingPath = pendingSubmenuFocusRef.current;
    const rootMenu = menuRef.current;

    if (pendingPath === null || rootMenu === null) {
      return;
    }

    const panel = findElementByPath(rootMenu, "contextMenuSubPanelPath", pendingPath);

    if (panel !== undefined) {
      getDirectMenuItems(panel).at(0)?.focus();
      pendingSubmenuFocusRef.current = null;
    }
  }, [openSubmenuPath]);

  useEffect(() => {
    if (activeMenu === null) {
      return;
    }

    const handleResize = () => {
      openSubmenuPathRef.current = [];
      setOpenSubmenuPath([]);
      updatePosition();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeMenu, updatePosition]);

  useEffect(() => {
    if (activeMenu === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      close("escape");
    };
    const preventBackgroundScroll = (event: Event) => {
      const eventTarget = event.target;

      if (eventTarget instanceof Node && menuRef.current?.contains(eventTarget)) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("touchmove", preventBackgroundScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("wheel", preventBackgroundScroll, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("touchmove", preventBackgroundScroll, true);
      document.removeEventListener("wheel", preventBackgroundScroll, true);
    };
  }, [activeMenu, close]);

  const contextValue = useMemo<ContextMenuContextValue>(
    () => ({
      close,
      open,
    }),
    [close, open],
  );
  const entries = activeMenu?.getEntries() ?? [];

  return {
    activeMenu,
    closeSubmenusFromDepth,
    contextValue,
    entries,
    handleAction,
    handleBackdropPointerDown,
    handleMenuKeyDown,
    menuRef,
    openSubmenu,
    openSubmenuPath,
    position,
  };
};
