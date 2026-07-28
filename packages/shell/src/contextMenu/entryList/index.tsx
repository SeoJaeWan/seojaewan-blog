"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import type { ContextMenuSubPanelPlacement } from "@window/ui";
import { ContextMenuButtonUI, ContextMenuSeparatorUI, ContextMenuSubPanelUI } from "@window/ui";

import type {
  AnyContextMenuEntry,
  ContextMenuActionEntry,
  ContextMenuSubmenuEntry,
} from "../types";
import { resolveContextMenuSubPanelPosition } from "../utils/resolveContextMenuSubPanelPosition";

const DEFAULT_SUBMENU_PLACEMENT: ContextMenuSubPanelPlacement = {
  right: 0,
  top: 0,
  transform: "translateX(100%)",
};

const encodeSubmenuPath = (path: readonly string[]) => JSON.stringify(path);

interface ContextMenuSubmenuProps {
  closeSubmenusFromDepth: (depth: number) => void;
  depth: number;
  entry: ContextMenuSubmenuEntry<string>;
  handleAction: (entry: ContextMenuActionEntry<string>) => void;
  openSubmenu: (path: readonly string[], focusFirstItem?: boolean) => void;
  openSubmenuPath: readonly string[];
  parentPath: readonly string[];
}

const ContextMenuSubmenu = ({
  closeSubmenusFromDepth,
  depth,
  entry,
  handleAction,
  openSubmenu,
  openSubmenuPath,
  parentPath,
}: ContextMenuSubmenuProps) => {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [placement, setPlacement] =
    useState<ContextMenuSubPanelPlacement>(DEFAULT_SUBMENU_PLACEMENT);
  const path = [...parentPath, entry.key];
  const encodedPath = encodeSubmenuPath(path);
  const isOpen =
    path.every((key, index) => openSubmenuPath[index] === key) &&
    openSubmenuPath.length >= path.length;
  const updatePlacement = useCallback(() => {
    const panelElement = panelRef.current;
    const triggerElement = triggerRef.current;

    if (panelElement === null || triggerElement === null) {
      return;
    }

    const panelRect = panelElement.getBoundingClientRect();
    const triggerRect = triggerElement.getBoundingClientRect();

    setPlacement(
      resolveContextMenuSubPanelPosition({
        panelHeight: panelRect.height,
        panelWidth: panelRect.width,
        triggerLeft: triggerRect.left,
        triggerRight: triggerRect.right,
        triggerTop: triggerRect.top,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);

    return () => {
      window.removeEventListener("resize", updatePlacement);
    };
  }, [isOpen, updatePlacement]);

  return (
    <div
      data-context-menu-submenu-wrapper=""
      onPointerEnter={() => {
        if (!entry.disabled) {
          openSubmenu(path);
        }
      }}
      onPointerLeave={() => closeSubmenusFromDepth(depth)}
      style={{ position: "relative" }}
    >
      <ContextMenuButtonUI
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-context-menu-submenu-path={encodedPath}
        disabled={entry.disabled}
        icon={entry.icon ?? null}
        label={entry.label}
        onClick={() => {
          if (isOpen) {
            closeSubmenusFromDepth(depth);
          } else {
            openSubmenu(path, true);
          }
        }}
        ref={triggerRef}
        role="menuitem"
        submenuIndicator
        tabIndex={-1}
      />
      <ContextMenuSubPanelUI
        data-context-menu-sub-panel-path={encodedPath}
        id={panelId}
        inert={!isOpen}
        open={isOpen}
        placement={placement}
        ref={panelRef}
      >
        <ContextMenuEntryList
          closeSubmenusFromDepth={closeSubmenusFromDepth}
          depth={depth + 1}
          entries={entry.entries}
          handleAction={handleAction}
          openSubmenu={openSubmenu}
          openSubmenuPath={openSubmenuPath}
          parentPath={path}
        />
      </ContextMenuSubPanelUI>
    </div>
  );
};

export interface ContextMenuEntryListProps {
  closeSubmenusFromDepth: (depth: number) => void;
  depth?: number;
  entries: readonly AnyContextMenuEntry[];
  handleAction: (entry: ContextMenuActionEntry<string>) => void;
  openSubmenu: (path: readonly string[], focusFirstItem?: boolean) => void;
  openSubmenuPath: readonly string[];
  parentPath?: readonly string[];
}

/**
 * 범용 action, submenu와 separator entry를 실제 Context Menu row tree로 렌더링한다.
 */
export const ContextMenuEntryList = ({
  closeSubmenusFromDepth,
  depth = 0,
  entries,
  handleAction,
  openSubmenu,
  openSubmenuPath,
  parentPath = [],
}: ContextMenuEntryListProps) => (
  <>
    {entries.map((entry) => {
      switch (entry.type) {
        case "action":
          return (
            <ContextMenuButtonUI
              key={entry.id}
              data-context-menu-action={entry.id}
              disabled={entry.disabled}
              icon={entry.icon ?? null}
              label={entry.label}
              onClick={() => handleAction(entry)}
              onPointerEnter={() => closeSubmenusFromDepth(depth)}
              role={entry.selected === undefined ? "menuitem" : "menuitemradio"}
              selected={entry.selected}
              tabIndex={-1}
            />
          );
        case "separator":
          return <ContextMenuSeparatorUI key={entry.key} />;
        case "submenu":
          return (
            <ContextMenuSubmenu
              key={entry.key}
              closeSubmenusFromDepth={closeSubmenusFromDepth}
              depth={depth}
              entry={entry}
              handleAction={handleAction}
              openSubmenu={openSubmenu}
              openSubmenuPath={openSubmenuPath}
              parentPath={parentPath}
            />
          );
      }
    })}
  </>
);
