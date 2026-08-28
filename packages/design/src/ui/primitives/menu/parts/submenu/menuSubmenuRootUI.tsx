import { Menu as BaseMenu } from "@base-ui/react/menu";

import type { MenuUISubmenuProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/toMenuUIChangeDetails";

/**
 * 부모 메뉴 항목 아래에 열리는 중첩 메뉴의 상태와 포커스 범위를 구성할 때 사용한다.
 *
 * MenuContentUI 안에서 SubmenuTrigger와 SubmenuContent를 함께 감싸는 위치에 조합한다.
 */
export function MenuSubmenuRootUI({
  closeParentOnEscape,
  onOpenChange,
  ...props
}: MenuUISubmenuProps) {
  return (
    <BaseMenu.SubmenuRoot
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toMenuUIChangeDetails(details.reason))}
    />
  );
}
