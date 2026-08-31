import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";

import type { ContextMenuUISubmenuProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/toContextMenuUIChangeDetails";

/**
 * 부모 문맥 메뉴 아래에 열리는 중첩 메뉴의 상태와 포커스 범위를 구성할 때 사용한다.
 *
 * ContextMenuContentUI 안에서 SubmenuTrigger와 SubmenuContent를 함께 감싸 조합한다.
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
      onOpenChange={(open, details) => onOpenChange?.(open, toContextMenuUIChangeDetails(details))}
    />
  );
}
