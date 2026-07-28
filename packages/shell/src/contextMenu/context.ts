import { createContext } from "react";

import type { AnyContextMenuEntry, ContextMenuCloseReason } from "./types";

export interface ContextMenuOpenRequest {
  anchorX: number;
  anchorY: number;
  animated: boolean;
  getEntries: () => readonly AnyContextMenuEntry[];
  onAction: (actionId: string) => void;
  onClose?: (reason: ContextMenuCloseReason) => void;
  ownerId: string;
  triggerElement: HTMLElement | null;
}

export interface CloseContextMenuOptions {
  ownerId?: string;
  restoreFocus?: boolean;
}

export interface ContextMenuContextValue {
  close: (reason: ContextMenuCloseReason, options?: CloseContextMenuOptions) => void;
  open: (request: ContextMenuOpenRequest) => void;
}

export const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);
