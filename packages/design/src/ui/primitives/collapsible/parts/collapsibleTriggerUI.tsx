import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type { CollapsibleUITriggerProps } from "../collapsibleUI.types";

/**
 * CollapsibleRootUI의 펼침 상태를 바꾸고 CollapsiblePanelUI와 ARIA 관계를 맺는 button이다.
 *
 * CollapsibleTriggerUI는 folder 선택 또는 tree 탐색 동작을 수행하지 않는다.
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
