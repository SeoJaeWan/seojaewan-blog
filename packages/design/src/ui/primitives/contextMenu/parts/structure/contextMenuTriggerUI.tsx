import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUITriggerProps } from "../../contextMenuUI.types";

/**
 * 문맥 메뉴 호출을 받을 화면 영역이 필요할 때 사용한다.
 *
 * ContextMenuRootUI 안에서 ContextMenuContentUI와 같은 단계에 조합한다.
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
