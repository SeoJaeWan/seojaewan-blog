import { forwardRef } from "react";

import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { clsx } from "clsx";

import type { CollapsibleUIPanelProps } from "../collapsibleUI.types";

/**
 * CollapsibleRootUI 안에서 Trigger가 펼치고 접는 소비자 제공 콘텐츠 영역을 렌더링한다.
 *
 * CollapsiblePanelUI는 콘텐츠의 데이터 구성, 선택 상태 또는 비즈니스 상태를 소유하지 않는다.
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
