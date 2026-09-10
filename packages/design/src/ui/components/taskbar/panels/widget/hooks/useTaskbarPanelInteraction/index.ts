import type { Popover } from "@base-ui/react/popover";

import type { TaskbarPanelOpenChangeReason, TaskbarPanelWidgetProps } from "../../index.js";

/**
 * Base UI의 상세 원인을 제품 Component의 안정된 open 변경 원인으로 좁힌다.
 */
const resolveOpenChangeReason = (reason: string): TaskbarPanelOpenChangeReason => {
  switch (reason) {
    case "escape-key":
      return "escape";
    case "focus-out":
      return "focus-out";
    case "outside-press":
      return "outside";
    case "trigger-focus":
    case "trigger-press":
      return "trigger";
    default:
      return "unknown";
  }
};

/**
 * Search의 focus·Escape·click을 controlled open 요청으로 연결한다.
 * Base UI 원인 변환과 DOM focus 해제를 소유하고 제품 상태는 callback에 위임한다.
 */
export const useTaskbarPanelInteraction = ({
  open,
  variant,
  onOpenChange,
}: Pick<TaskbarPanelWidgetProps, "open" | "variant" | "onOpenChange">) => {
  /**
   * Base UI dismiss를 제품 open 요청으로 전달하고 Search Escape focus를 제거한다.
   */
  const handleOpenChange = (nextOpen: boolean, details: Popover.Root.ChangeEventDetails) => {
    const reason = resolveOpenChangeReason(details.reason);

    if (!nextOpen && variant === "search" && reason === "escape") {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }

    onOpenChange(nextOpen, reason);
  };

  /**
   * Search input의 keyboard/pointer focus도 동일한 controlled open 요청으로 연결한다.
   */
  const handleTriggerFocus = () => {
    if (variant === "search" && !open) {
      onOpenChange(true, "trigger");
    }
  };

  /**
   * Search 재클릭은 입력 focus를 유지하도록 Base UI의 toggle 처리만 생략한다.
   */
  const handleTriggerClick: NonNullable<Popover.Trigger.Props["onClick"]> = (event) => {
    if (variant === "search") event.preventBaseUIHandler();
  };
  return { handleOpenChange, handleTriggerFocus, handleTriggerClick };
};
