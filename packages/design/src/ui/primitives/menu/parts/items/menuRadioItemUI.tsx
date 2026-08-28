import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIRadioItemProps } from "../../menuUI.types";

/**
 * 상호 배타적인 선택지 하나를 메뉴 항목으로 나타낼 때 사용한다.
 *
 * MenuRadioGroupUI 안에서 같은 그룹의 다른 RadioItem과 나란히 조합한다.
 */
export const MenuRadioItemUI = forwardRef<HTMLDivElement, MenuUIRadioItemProps>(
  function MenuRadioItemUI(
    { children, className, closeOnSelect, variant = "default", ...props },
    ref,
  ) {
    return (
      <BaseMenu.RadioItem
        {...props}
        className={clsx("wd-menu-ui__item", className)}
        closeOnClick={closeOnSelect}
        data-variant={variant}
        ref={ref}
      >
        <BaseMenu.RadioItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
          ●
        </BaseMenu.RadioItemIndicator>
        <span className="wd-menu-ui__item-label">{children}</span>
      </BaseMenu.RadioItem>
    );
  },
);
