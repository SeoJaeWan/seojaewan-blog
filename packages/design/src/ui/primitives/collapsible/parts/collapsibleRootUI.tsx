import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type { CollapsibleUIProps } from "../collapsibleUI.types";

/**
 * CollapsibleUI 조합의 최상위에서 Trigger와 Panel에 제어 또는 비제어 방식의 펼침 상태를 공유한다.
 *
 * CollapsibleRootUI는 펼침 상태만 조정하며 콘텐츠 구성, tree 선택 또는 애플리케이션 상태를 소유하지 않는다.
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
