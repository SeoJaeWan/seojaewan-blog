import { MenuCheckboxItemUI } from "./parts/menuCheckboxItemUI";
import { MenuContentUI } from "./parts/menuContentUI";
import { MenuItemUI } from "./parts/menuItemUI";
import { MenuRadioGroupUI } from "./parts/menuRadioGroupUI";
import { MenuRadioItemUI } from "./parts/menuRadioItemUI";
import { MenuRootUI } from "./parts/menuRootUI";
import { MenuSeparatorUI } from "./parts/menuSeparatorUI";
import { MenuSubmenuContentUI } from "./parts/menuSubmenuContentUI";
import { MenuSubmenuRootUI } from "./parts/menuSubmenuRootUI";
import { MenuSubmenuTriggerUI } from "./parts/menuSubmenuTriggerUI";
import { MenuTriggerUI } from "./parts/menuTriggerUI";

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

/** MenuUI가 소유하는 중첩 menu part 집합이다. 제품 action 모델은 포함하지 않는다. */
export const MenuSubmenuUI = {
  Root: MenuSubmenuRootUI,
  Trigger: MenuSubmenuTriggerUI,
  Content: MenuSubmenuContentUI,
} as const;

/** Menu compound family의 public part 집합이다. 제품 action catalog는 포함하지 않는다. */
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
