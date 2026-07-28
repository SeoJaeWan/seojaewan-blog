import type { WindowItemContextActionId, WindowItemContextActionState } from "@window/ui";
import { resolveWindowItemActionVisuals } from "@window/ui";

import type { ContextMenuEntry } from "../../../../contextMenu";

/**
 * WindowItem action 상태를 범용 Context Menu Host가 렌더할 action entry로 변환한다.
 *
 * @param actions surface가 현재 item에 표시하기로 결정한 WindowItem action 상태
 * @returns label, icon과 close focus 정책이 결합된 범용 Context Menu entry
 */
export const resolveWindowItemContextEntries = (
  actions: readonly WindowItemContextActionState[],
): readonly ContextMenuEntry<WindowItemContextActionId>[] =>
  resolveWindowItemActionVisuals<WindowItemContextActionId>(actions).map((action) => ({
    disabled: action.disabled,
    icon: action.icon,
    id: action.id,
    label: action.label,
    restoreFocus: action.id !== "open" && action.id !== "openLocation",
    type: "action",
  }));
