import { Menu as BaseMenu } from "@base-ui/react/menu";

import type { MenuUISubmenuProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/menuUIChangeDetails";

/**
 * 중첩 menu의 open state와 focus 범위를 구성한다.
 *
 * 하위 action의 제품 의미는 소유하지 않는다.
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
