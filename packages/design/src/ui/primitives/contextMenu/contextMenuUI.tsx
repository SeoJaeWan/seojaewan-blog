import { ContextMenuCheckboxItemUI } from "./parts/items/contextMenuCheckboxItemUI";
import { ContextMenuItemUI } from "./parts/items/contextMenuItemUI";
import { ContextMenuRadioGroupUI } from "./parts/items/contextMenuRadioGroupUI";
import { ContextMenuRadioItemUI } from "./parts/items/contextMenuRadioItemUI";
import { ContextMenuSeparatorUI } from "./parts/items/contextMenuSeparatorUI";
import { ContextMenuContentUI } from "./parts/structure/contextMenuContentUI";
import { ContextMenuRootUI } from "./parts/structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "./parts/structure/contextMenuTriggerUI";
import { ContextMenuSubmenuContentUI } from "./parts/submenu/contextMenuSubmenuContentUI";
import { ContextMenuSubmenuRootUI } from "./parts/submenu/contextMenuSubmenuRootUI";
import { ContextMenuSubmenuTriggerUI } from "./parts/submenu/contextMenuSubmenuTriggerUI";

import "../menu/menuUI.css";
import "./contextMenuUI.css";

export {
  ContextMenuCheckboxItemUI,
  ContextMenuContentUI,
  ContextMenuItemUI,
  ContextMenuRadioGroupUI,
  ContextMenuRadioItemUI,
  ContextMenuRootUI,
  ContextMenuSeparatorUI,
  ContextMenuSubmenuContentUI,
  ContextMenuSubmenuRootUI,
  ContextMenuSubmenuTriggerUI,
  ContextMenuTriggerUI,
};

/**
 * 하나의 문맥 메뉴 항목 아래에 단계가 더 있는 중첩 메뉴를 구성할 때 사용한다.
 *
 * ContextMenuUI.Content 안에서 Root가 Trigger와 Content를 감싸는 위치에 조합한다.
 */
export const ContextMenuSubmenuUI = {
  Root: ContextMenuSubmenuRootUI,
  Trigger: ContextMenuSubmenuTriggerUI,
  Content: ContextMenuSubmenuContentUI,
} as const;

/**
 * 특정 화면 영역에서 보조 포인터나 키보드로 여는 문맥 메뉴가 필요할 때 사용한다.
 *
 * Root 안에 호출 영역인 Trigger와 Content를 두고 Content 안에 항목 part를 조합한다.
 */
export const ContextMenuUI = {
  Root: ContextMenuRootUI,
  Trigger: ContextMenuTriggerUI,
  Content: ContextMenuContentUI,
  Item: ContextMenuItemUI,
  CheckboxItem: ContextMenuCheckboxItemUI,
  RadioGroup: ContextMenuRadioGroupUI,
  RadioItem: ContextMenuRadioItemUI,
  Separator: ContextMenuSeparatorUI,
  Submenu: ContextMenuSubmenuUI,
} as const;
