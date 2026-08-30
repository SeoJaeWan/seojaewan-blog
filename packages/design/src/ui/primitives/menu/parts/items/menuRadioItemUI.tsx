import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { RadioButton16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import type { MenuUIRadioItemProps } from "../../menuUI.types";
import { MenuItemPresentation } from "./menuItemPresentation";

/**
 * 상호 배타적인 선택지 하나를 메뉴 항목으로 나타낼 때 사용한다.
 *
 * MenuRadioGroupUI 안에서 같은 그룹의 다른 RadioItem과 나란히 조합한다.
 */
export const MenuRadioItemUI = forwardRef<HTMLDivElement, MenuUIRadioItemProps>(
  function MenuRadioItemUI(
    { children, className, closeOnSelect, icon, trailing, variant = "default", ...props },
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
        <MenuItemPresentation
          icon={icon}
          indicator={
            <BaseMenu.RadioItemIndicator className="wd-menu-ui__item-indicator" keepMounted>
              <RadioButton16Regular />
            </BaseMenu.RadioItemIndicator>
          }
          trailing={trailing}
        >
          {children}
        </MenuItemPresentation>
      </BaseMenu.RadioItem>
    );
  },
);
