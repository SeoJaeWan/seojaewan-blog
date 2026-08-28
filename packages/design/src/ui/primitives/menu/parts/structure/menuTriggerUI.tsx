import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUITriggerProps } from "../../menuUI.types";

/**
 * 사용자가 menu를 열 수 있는 보이는 button entry point를 제공한다.
 *
 * button의 제품 문구나 action 권한은 결정하지 않는다.
 */
export const MenuTriggerUI = forwardRef<HTMLButtonElement, MenuUITriggerProps>(
  function MenuTriggerUI({ className, openDelay, ...props }, ref) {
    return (
      <BaseMenu.Trigger
        {...props}
        className={clsx("wd-menu-ui__trigger", className)}
        delay={openDelay}
        ref={ref}
      />
    );
  },
);
