import type { ReactElement } from "react";

import { ContextMenu } from "@base-ui/react/context-menu";

import type { FileExplorerSidebarContextEntry } from "../../../../../../headless/folders/index.js";

type ContextRowProps = Readonly<{
  children: ReactElement;
  entries: readonly FileExplorerSidebarContextEntry[];
  onDismiss: () => void;
  onEntry: (entry: FileExplorerSidebarContextEntry) => void;
  portalContainer?: HTMLElement | null;
}>;

/**
 * Invocation 행과 그 행의 Sidebar 전용 Context Menu를 조합한다.
 */
export const ContextRow = ({
  children,
  entries,
  onDismiss,
  onEntry,
  portalContainer,
}: ContextRowProps) => (
  <ContextMenu.Root
    onOpenChange={(open, details) => {
      if (!open && (details.reason === "escape-key" || details.reason === "outside-press")) {
        onDismiss();
      }
    }}
  >
    <ContextMenu.Trigger render={children} />
    <ContextMenu.Portal container={portalContainer}>
      <ContextMenu.Positioner className="file-explorer-sidebar__menu-positioner">
        <ContextMenu.Popup aria-label="사이드바 메뉴" className="file-explorer-sidebar__menu">
          {entries.map((entry) => (
            <ContextMenu.Item
              className="file-explorer-sidebar__menu-item"
              key={entry.id}
              onClick={() => onEntry(entry)}
            >
              {entry.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  </ContextMenu.Root>
);
