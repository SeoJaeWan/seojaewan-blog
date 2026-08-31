import { PopoverCloseUI } from "./parts/popoverCloseUI";
import { PopoverContentUI } from "./parts/popoverContentUI";
import { PopoverDescriptionUI } from "./parts/popoverDescriptionUI";
import { PopoverRootUI } from "./parts/popoverRootUI";
import { PopoverTitleUI } from "./parts/popoverTitleUI";
import { PopoverTriggerUI } from "./parts/popoverTriggerUI";

import "./popoverUI.css";

/**
 * 기준 요소에 연결되어 주변 상호작용을 막지 않는 보조 콘텐츠에는 비모달 Root와 관련 part를 묶은 PopoverUI를 사용한다.
 *
 * 페이지 나머지와 초점을 격리해야 하면 DialogUI를 사용하며, PopoverUI는 애플리케이션 상태나 탐색을 소유하지 않는다.
 */
export const PopoverUI = Object.assign(PopoverRootUI, {
  Close: PopoverCloseUI,
  Content: PopoverContentUI,
  Description: PopoverDescriptionUI,
  Title: PopoverTitleUI,
  Trigger: PopoverTriggerUI,
});

export { PopoverCloseUI, PopoverContentUI, PopoverDescriptionUI, PopoverTitleUI, PopoverTriggerUI };
