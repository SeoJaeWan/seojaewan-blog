import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUITriggerProps } from "../../menuUI.types";

/**
 * 사용자가 메뉴를 열고 닫는 보이는 버튼이 필요할 때 사용한다.
 *
 * MenuRootUI 안에서 MenuContentUI와 같은 단계에 조합한다.
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
