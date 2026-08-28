"use client";

import { SelectClearUI } from "./parts/control/selectClearUI";
import { SelectLabelUI } from "./parts/control/selectLabelUI";
import { SelectTriggerUI } from "./parts/control/selectTriggerUI";
import { SelectValueUI } from "./parts/control/selectValueUI";
import { SelectContentUI } from "./parts/options/selectContentUI";
import { SelectItemUI } from "./parts/options/selectItemUI";
import { SelectListUI } from "./parts/options/selectListUI";
import { SelectRootUI } from "./parts/selectRootUI";

import "./selectUI.css";

export {
  SelectClearUI,
  SelectContentUI,
  SelectItemUI,
  SelectLabelUI,
  SelectListUI,
  SelectRootUI,
  SelectTriggerUI,
  SelectValueUI,
};

/**
 * 입력 없이 미리 정의된 값 하나를 고르는 조합형 API다. `Root`와 control, options part를 한 이름 아래에서 조합한다.
 *
 * 여러 태그 편집, 선택지 영속화나 애플리케이션 업무 상태 갱신은 담당하지 않는다.
 */
export const SelectUI = {
  Root: SelectRootUI,
  Label: SelectLabelUI,
  Trigger: SelectTriggerUI,
  Value: SelectValueUI,
  Clear: SelectClearUI,
  Content: SelectContentUI,
  List: SelectListUI,
  Item: SelectItemUI,
} as const;
