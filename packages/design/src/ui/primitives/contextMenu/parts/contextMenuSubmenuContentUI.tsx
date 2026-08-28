import { forwardRef } from "react";

import type { ContextMenuUIContentProps } from "../contextMenuUI.types";
import { ContextMenuContentUI } from "./contextMenuContentUI";

/**
 * 중첩 context menu의 role과 기본 배치를 제공한다.
 * 하위 item의 제품 구성은 결정하지 않는다.
 */
export const ContextMenuSubmenuContentUI = forwardRef<HTMLDivElement, ContextMenuUIContentProps>(
  function ContextMenuSubmenuContentUI(
    { align = "start", side = "inline-end", sideOffset = 2, ...props },
    ref,
  ) {
    return (
      <ContextMenuContentUI
        {...props}
        align={align}
        ref={ref}
        side={side}
        sideOffset={sideOffset}
      />
    );
  },
);
