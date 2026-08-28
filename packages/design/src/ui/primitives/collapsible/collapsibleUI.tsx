import { CollapsiblePanelUI } from "./parts/collapsiblePanelUI";
import { CollapsibleRootUI } from "./parts/collapsibleRootUI";
import { CollapsibleTriggerUI } from "./parts/collapsibleTriggerUI";

import "./collapsibleUI.css";

/**
 * 펼침 상태를 공유하는 Root, Trigger와 Panel을 하나의 compound API로 묶는다.
 *
 * CollapsibleUI는 folder 구성, tree 선택 또는 애플리케이션 비즈니스 상태를 소유하지 않는다.
 */
export const CollapsibleUI = {
  Root: CollapsibleRootUI,
  Trigger: CollapsibleTriggerUI,
  Panel: CollapsiblePanelUI,
} as const;

export { CollapsiblePanelUI, CollapsibleRootUI, CollapsibleTriggerUI };
