import type { MenuUIChangeDetails, MenuUIOpenChangeReason } from "../menuUI.types";

export const toMenuUIChangeDetails = (reason: string): MenuUIChangeDetails => ({
  reason: reason as MenuUIOpenChangeReason,
});
