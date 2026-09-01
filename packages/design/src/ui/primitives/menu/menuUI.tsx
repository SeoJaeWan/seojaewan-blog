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
 * 하나의 메뉴 항목 아래에 단계가 더 있는 중첩 메뉴를 구성할 때 사용한다.
 *
 * MenuUI.Content 안에서 Root가 Trigger와 Content를 감싸는 위치에 조합한다.
 */
export const MenuSubmenuUI = {
  Root: MenuSubmenuRootUI,
  Trigger: MenuSubmenuTriggerUI,
  Content: MenuSubmenuContentUI,
} as const;

/**
 * 버튼을 기준으로 열리는 메뉴가 필요할 때 구조·항목·중첩 part를 제공한다.
 *
 * Root 안에 Trigger와 Content를 두고 Content 안에 항목 part를 조합한다.
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
