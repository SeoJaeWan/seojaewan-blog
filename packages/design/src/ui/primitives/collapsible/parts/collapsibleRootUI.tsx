import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type { CollapsibleUIProps } from "../collapsibleUI.types";

/**
 * controlled 또는 uncontrolled 펼침 상태를 조정하고 하위 part에 공유한다.
 *
 * CollapsibleRootUI는 folder 구성, tree 선택 또는 애플리케이션 상태를 소유하지 않는다.
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
