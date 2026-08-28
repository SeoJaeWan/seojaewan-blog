import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import type { ContextMenuUISubmenuProps } from "../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../contextMenuUIChangeDetails";

/**
 * 중첩 context menu의 open state와 focus 범위를 구성한다.
 * 하위 action의 제품 의미는 소유하지 않는다.
 */
export function ContextMenuSubmenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuUISubmenuProps) {
  return (
    <BaseContextMenu.SubmenuRoot
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) =>
        onOpenChange?.(open, toContextMenuUIChangeDetails(details.reason))
      }
    />
  );
}
