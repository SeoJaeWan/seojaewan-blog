import { ContextMenuCheckboxItemUI } from "./parts/contextMenuCheckboxItemUI";
import { ContextMenuContentUI } from "./parts/contextMenuContentUI";
import { ContextMenuItemUI } from "./parts/contextMenuItemUI";
import { ContextMenuRadioGroupUI } from "./parts/contextMenuRadioGroupUI";
import { ContextMenuRadioItemUI } from "./parts/contextMenuRadioItemUI";
import { ContextMenuRootUI } from "./parts/contextMenuRootUI";
import { ContextMenuSeparatorUI } from "./parts/contextMenuSeparatorUI";
import { ContextMenuSubmenuContentUI } from "./parts/contextMenuSubmenuContentUI";
import { ContextMenuSubmenuRootUI } from "./parts/contextMenuSubmenuRootUI";
import { ContextMenuSubmenuTriggerUI } from "./parts/contextMenuSubmenuTriggerUI";
import { ContextMenuTriggerUI } from "./parts/contextMenuTriggerUI";

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

/** ContextMenuUI가 소유하는 중첩 menu part 집합이다. 제품 action 모델은 포함하지 않는다. */
export const ContextMenuSubmenuUI = {
  Root: ContextMenuSubmenuRootUI,
  Trigger: ContextMenuSubmenuTriggerUI,
  Content: ContextMenuSubmenuContentUI,
} as const;

/** ContextMenu compound family의 public part 집합이다. 제품 action catalog는 포함하지 않는다. */
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
