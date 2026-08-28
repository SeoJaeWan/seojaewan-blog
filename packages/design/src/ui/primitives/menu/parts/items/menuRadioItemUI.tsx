import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIRadioItemProps } from "../../menuUI.types";

/**
 * radio action의 checked state와 선택 가능한 값을 제공한다.
 *
 * 제품 설정의 의미는 해석하지 않는다.
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
