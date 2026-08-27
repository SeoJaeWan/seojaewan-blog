import type { ReactNode } from "react";

import type { ButtonUIProps } from "../button";

/** Project-owned props for an icon-only native action button. */
export interface IconButtonUIProps extends Omit<
  ButtonUIProps,
  "aria-label" | "aria-labelledby" | "children"
> {
  /** Required accessible name, deliberately independent of raw ARIA props. */
  label: string;
  /** Decorative visual announced through `label`, not through the icon subtree. */
  icon: ReactNode;
}
