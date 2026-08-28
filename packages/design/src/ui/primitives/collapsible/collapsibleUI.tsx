import { CollapsiblePanelUI } from "./parts/collapsiblePanelUI";
import { CollapsibleRootUI } from "./parts/collapsibleRootUI";
import { CollapsibleTriggerUI } from "./parts/collapsibleTriggerUI";

import "./collapsibleUI.css";

/**
 * 한 영역을 펼치고 접는 공개·숨김 전환에는 Root, Trigger와 Panel을 묶은 CollapsibleUI를 사용한다.
 *
 * CollapsibleUI는 공개 여부만 조정하며 메뉴 동작, tree 선택, 콘텐츠 구성 또는 애플리케이션 비즈니스 상태를 소유하지 않는다.
 */
export const CollapsibleUI = {
  Root: CollapsibleRootUI,
  Trigger: CollapsibleTriggerUI,
  Panel: CollapsiblePanelUI,
} as const;

export { CollapsiblePanelUI, CollapsibleRootUI, CollapsibleTriggerUI };
