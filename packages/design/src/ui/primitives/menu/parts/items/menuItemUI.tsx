import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIItemProps } from "../../menuUI.types";

/**
 * 일반 menu action의 role, disabled state, 선택 event를 제공한다.
 *
 * 실제 제품 action의 부작용은 실행하지 않는다.
 */
export const MenuItemUI = forwardRef<HTMLDivElement, MenuUIItemProps>(function MenuItemUI(
  { className, closeOnSelect, variant = "default", ...props },
  ref,
) {
  return (
    <BaseMenu.Item
      {...props}
      className={clsx("wd-menu-ui__item", className)}
      closeOnClick={closeOnSelect}
      data-variant={variant}
      ref={ref}
    />
  );
});
