import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUITriggerProps } from "../../contextMenuUI.types";

/**
 * 보조 pointer와 keyboard invocation을 수신하는 surface를 제공한다.
 *
 * surface의 제품 선택 상태나 action 목록은 결정하지 않는다.
 */
export const ContextMenuTriggerUI = forwardRef<HTMLDivElement, ContextMenuUITriggerProps>(
  function ContextMenuTriggerUI({ className, ...props }, ref) {
    return (
      <BaseContextMenu.Trigger
        {...props}
        className={clsx("wd-context-menu-ui__trigger", className)}
        ref={ref}
      />
    );
  },
);
