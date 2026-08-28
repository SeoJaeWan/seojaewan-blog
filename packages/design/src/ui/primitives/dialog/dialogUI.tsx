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
 * modal dialog와 이를 열고 설명하고 닫는 part를 하나의 compound API로 묶는다.
 *
 * anchored non-modal content에는 PopoverUI를 사용하며 DialogUI는 비즈니스 확인이나 탐색을 소유하지 않는다.
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
