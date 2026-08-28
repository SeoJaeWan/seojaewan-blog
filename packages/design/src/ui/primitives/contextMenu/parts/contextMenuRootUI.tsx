import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import type { ContextMenuUIProps } from "../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../contextMenuUIChangeDetails";

/**
 * 보조 pointer 또는 keyboard 호출로 여는 context menu 상태를 구성한다.
 * 호출 대상의 제품 action이나 business state는 소유하지 않는다.
 */
export function ContextMenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: ContextMenuUIProps) {
  return (
    <BaseContextMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) =>
        onOpenChange?.(open, toContextMenuUIChangeDetails(details.reason))
      }
    />
  );
}
