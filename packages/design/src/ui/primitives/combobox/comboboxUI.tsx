"use client";

import { ComboboxRootUI } from "./parts/comboboxRootUI";
import { ComboboxClearUI } from "./parts/control/comboboxClearUI";
import { ComboboxInputGroupUI } from "./parts/control/comboboxInputGroupUI";
import { ComboboxInputUI } from "./parts/control/comboboxInputUI";
import { ComboboxLabelUI } from "./parts/control/comboboxLabelUI";
import { ComboboxTriggerUI } from "./parts/control/comboboxTriggerUI";
import { ComboboxContentUI } from "./parts/options/comboboxContentUI";
import { ComboboxEmptyUI } from "./parts/options/comboboxEmptyUI";
import { ComboboxItemUI } from "./parts/options/comboboxItemUI";
import { ComboboxListUI } from "./parts/options/comboboxListUI";

import "./comboboxUI.css";

export {
  ComboboxClearUI,
  ComboboxContentUI,
  ComboboxEmptyUI,
  ComboboxInputGroupUI,
  ComboboxInputUI,
  ComboboxItemUI,
  ComboboxLabelUI,
  ComboboxListUI,
  ComboboxRootUI,
  ComboboxTriggerUI,
};

/**
 * 미리 정의된 선택지를 검색하고 하나를 선택하는 조합형 API다. `Root`와 control, options part를 한 이름 아래에서 조합한다.
 *
 * 애플리케이션의 경로 이동, 선택지 조회나 자유 입력 값 저장은 담당하지 않는다.
 */
export const ComboboxUI = {
  Root: ComboboxRootUI,
  Label: ComboboxLabelUI,
  InputGroup: ComboboxInputGroupUI,
  Input: ComboboxInputUI,
  Trigger: ComboboxTriggerUI,
  Clear: ComboboxClearUI,
  Content: ComboboxContentUI,
  List: ComboboxListUI,
  Item: ComboboxItemUI,
  Empty: ComboboxEmptyUI,
} as const;
