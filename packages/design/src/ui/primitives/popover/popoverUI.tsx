import { PopoverCloseUI } from "./parts/popoverCloseUI";
import { PopoverContentUI } from "./parts/popoverContentUI";
import { PopoverDescriptionUI } from "./parts/popoverDescriptionUI";
import { PopoverRootUI } from "./parts/popoverRootUI";
import { PopoverTitleUI } from "./parts/popoverTitleUI";
import { PopoverTriggerUI } from "./parts/popoverTriggerUI";

import "./popoverUI.css";

/**
 * anchored non-modal surface와 이를 여닫고 설명하는 part를 하나의 compound API로 묶는다.
 *
 * focus를 격리해야 하면 DialogUI를 사용하며 PopoverUI는 애플리케이션 상태나 탐색을 소유하지 않는다.
 */
export const PopoverUI = Object.assign(PopoverRootUI, {
  Close: PopoverCloseUI,
  Content: PopoverContentUI,
  Description: PopoverDescriptionUI,
  Title: PopoverTitleUI,
  Trigger: PopoverTriggerUI,
});

export { PopoverCloseUI, PopoverContentUI, PopoverDescriptionUI, PopoverTitleUI, PopoverTriggerUI };
