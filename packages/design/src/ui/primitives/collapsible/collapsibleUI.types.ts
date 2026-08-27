import type { ComponentPropsWithRef } from "react";

/** Project-owned open-state contract for the disclosure root. */
export interface CollapsibleUIProps extends ComponentPropsWithRef<"div"> {
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

/**
 * Native button props for the disclosure trigger.
 * Folder selection and tree navigation remain consumer responsibilities.
 */
export type CollapsibleUITriggerProps = Omit<ComponentPropsWithRef<"button">, "role">;

/**
 * Native container props for disclosure content.
 * Folder composition and business data remain consumer responsibilities.
 */
export type CollapsibleUIPanelProps = ComponentPropsWithRef<"div">;
