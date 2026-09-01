import { DialogBackdropUI } from "./parts/dialogBackdropUI";
import { DialogCloseUI } from "./parts/dialogCloseUI";
import { DialogContentUI } from "./parts/dialogContentUI";
import { DialogDescriptionUI } from "./parts/dialogDescriptionUI";
import { DialogPortalUI } from "./parts/dialogPortalUI";
import { DialogRootUI } from "./parts/dialogRootUI";
import { DialogTitleUI } from "./parts/dialogTitleUI";
import { DialogTriggerUI } from "./parts/dialogTriggerUI";

import "./dialogUI.css";

/**
 * 페이지 나머지와 초점 및 상호작용을 격리해야 하는 흐름에는 모달 Root와 관련 part를 묶은 DialogUI를 사용한다.
 *
 * 기준 요소에 연결된 비모달 보조 콘텐츠에는 PopoverUI를 사용하며, DialogUI는 비즈니스 확인 결과나 애플리케이션 탐색을 소유하지 않는다.
 */
export const DialogUI = Object.assign(DialogRootUI, {
  Backdrop: DialogBackdropUI,
  Close: DialogCloseUI,
  Content: DialogContentUI,
  Description: DialogDescriptionUI,
  Portal: DialogPortalUI,
  Title: DialogTitleUI,
  Trigger: DialogTriggerUI,
});

export {
  DialogBackdropUI,
  DialogCloseUI,
  DialogContentUI,
  DialogDescriptionUI,
  DialogPortalUI,
  DialogTitleUI,
  DialogTriggerUI,
};
