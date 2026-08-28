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
 * ContextMenuUI 안에서 중첩 메뉴를 구성하는 Root·Trigger·Content 묶음이다.
 *
 * 제품 action 모델이나 하위 항목의 순서·권한은 포함하지 않는다.
 */
export const ContextMenuSubmenuUI = {
  Root: ContextMenuSubmenuRootUI,
  Trigger: ContextMenuSubmenuTriggerUI,
  Content: ContextMenuSubmenuContentUI,
} as const;

/**
 * 보조 포인터나 키보드 호출로 여는 메뉴의 구조·항목·중첩 part를 한 경로로 제공한다.
 *
 * 제품 action catalog와 실행 정책은 정의하거나 저장하지 않는다.
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
