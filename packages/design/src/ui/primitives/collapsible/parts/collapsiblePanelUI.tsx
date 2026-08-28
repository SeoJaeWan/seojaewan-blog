import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type { CollapsibleUIPanelProps } from "../collapsibleUI.types";

/**
 * CollapsibleTriggerUI가 여닫는 consumer 제공 content 영역을 렌더링한다.
 *
 * CollapsiblePanelUI는 folder 데이터 구성이나 비즈니스 상태를 소유하지 않는다.
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
