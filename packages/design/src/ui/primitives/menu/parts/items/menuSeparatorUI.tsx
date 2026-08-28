import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUISeparatorProps } from "../../menuUI.types";

/**
 * action 묶음 사이의 의미상 separator를 제공한다.
 *
 * 제품 action을 그룹화하는 규칙은 결정하지 않는다.
 */
export const MenuSeparatorUI = forwardRef<HTMLDivElement, MenuUISeparatorProps>(
  function MenuSeparatorUI({ className, ...props }, ref) {
    return (
      <BaseMenu.Separator
        {...props}
        className={clsx("wd-menu-ui__separator", className)}
        ref={ref}
      />
    );
  },
);
