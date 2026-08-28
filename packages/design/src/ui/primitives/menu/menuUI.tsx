import { MenuCheckboxItemUI } from "./parts/items/menuCheckboxItemUI";
import { MenuItemUI } from "./parts/items/menuItemUI";
import { MenuRadioGroupUI } from "./parts/items/menuRadioGroupUI";
import { MenuRadioItemUI } from "./parts/items/menuRadioItemUI";
import { MenuSeparatorUI } from "./parts/items/menuSeparatorUI";
import { MenuContentUI } from "./parts/structure/menuContentUI";
import { MenuRootUI } from "./parts/structure/menuRootUI";
import { MenuTriggerUI } from "./parts/structure/menuTriggerUI";
import { MenuSubmenuContentUI } from "./parts/submenu/menuSubmenuContentUI";
import { MenuSubmenuRootUI } from "./parts/submenu/menuSubmenuRootUI";
import { MenuSubmenuTriggerUI } from "./parts/submenu/menuSubmenuTriggerUI";

import "./menuUI.css";

export {
  MenuCheckboxItemUI,
  MenuContentUI,
  MenuItemUI,
  MenuRadioGroupUI,
  MenuRadioItemUI,
  MenuRootUI,
  MenuSeparatorUI,
  MenuSubmenuContentUI,
  MenuSubmenuRootUI,
  MenuSubmenuTriggerUI,
  MenuTriggerUI,
};

/**
 * MenuUI 안에서 중첩 메뉴를 구성하는 Root·Trigger·Content 묶음이다.
 *
 * 제품 action 모델이나 하위 항목의 순서·권한은 포함하지 않는다.
 */
export const MenuSubmenuUI = {
  Root: MenuSubmenuRootUI,
  Trigger: MenuSubmenuTriggerUI,
  Content: MenuSubmenuContentUI,
} as const;

/**
 * 버튼으로 여는 메뉴의 구조·항목·중첩 메뉴 part를 한 소비 경로로 제공한다.
 *
 * 제품 action catalog와 실행 정책은 정의하거나 저장하지 않는다.
 */
export const MenuUI = {
  Root: MenuRootUI,
  Trigger: MenuTriggerUI,
  Content: MenuContentUI,
  Item: MenuItemUI,
  CheckboxItem: MenuCheckboxItemUI,
  RadioGroup: MenuRadioGroupUI,
  RadioItem: MenuRadioItemUI,
  Separator: MenuSeparatorUI,
  Submenu: MenuSubmenuUI,
} as const;
