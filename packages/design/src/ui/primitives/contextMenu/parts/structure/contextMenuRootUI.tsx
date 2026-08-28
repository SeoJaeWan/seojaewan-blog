import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import type { ContextMenuUIProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/toContextMenuUIChangeDetails";

/**
 * 특정 영역에서 호출하는 문맥 메뉴 전체의 열림 상태와 포커스 범위를 구성할 때 사용한다.
 *
 * 최상위에서 ContextMenuTriggerUI와 ContextMenuContentUI를 함께 감싸 조합한다.
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
