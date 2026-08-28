import type {
  ContextMenuUIChangeDetails,
  ContextMenuUIOpenChangeReason,
} from "../contextMenuUI.types";

export const toContextMenuUIChangeDetails = (reason: string): ContextMenuUIChangeDetails => ({
  reason: reason as ContextMenuUIOpenChangeReason,
});
