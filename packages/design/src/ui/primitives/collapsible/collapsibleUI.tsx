import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type {
  CollapsibleUIPanelProps,
  CollapsibleUIProps,
  CollapsibleUITriggerProps,
} from "./collapsibleUI.types";

import "./collapsibleUI.css";

/**
 * Coordinates controlled or uncontrolled disclosure state and ARIA linkage.
 * It does not own folder composition, tree selection, or application business state.
 */
export const CollapsibleRootUI = forwardRef<HTMLDivElement, CollapsibleUIProps>(
  function CollapsibleRootUI({ className, onOpenChange, ...props }, ref) {
    return (
      <BaseCollapsible.Root
        {...props}
        className={clsx("wd-collapsible-ui", className)}
        onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
        ref={ref}
      />
    );
  },
);

/**
 * A native button that toggles its disclosure panel with generated ARIA state.
 * It does not perform folder selection or tree-navigation actions.
 */
export const CollapsibleTriggerUI = forwardRef<HTMLButtonElement, CollapsibleUITriggerProps>(
  function CollapsibleTriggerUI({ className, type = "button", ...props }, ref) {
    return (
      <BaseCollapsible.Trigger
        {...props}
        className={clsx("wd-collapsible-ui__trigger", className)}
        ref={ref}
        type={type}
      />
    );
  },
);

/**
 * The region disclosed by a CollapsibleUI trigger.
 * It only presents consumer-provided content and does not compose folder data.
 */
export const CollapsiblePanelUI = forwardRef<HTMLDivElement, CollapsibleUIPanelProps>(
  function CollapsiblePanelUI({ className, ...props }, ref) {
    return (
      <BaseCollapsible.Panel
        {...props}
        className={clsx("wd-collapsible-ui__panel", className)}
        ref={ref}
      />
    );
  },
);

/** Project-owned Root, Trigger, and Panel parts for a provider-free disclosure. */
export const CollapsibleUI = {
  Root: CollapsibleRootUI,
  Trigger: CollapsibleTriggerUI,
  Panel: CollapsiblePanelUI,
} as const;
