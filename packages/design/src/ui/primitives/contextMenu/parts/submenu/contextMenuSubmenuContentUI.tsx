import type { ContextMenuUIContentProps } from "../../contextMenuUI.types";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";

/**
 * 중첩 문맥 메뉴의 항목을 별도 popup으로 표시할 때 사용한다.
 *
 * ContextMenuSubmenuRootUI 안에서 ContextMenuSubmenuTriggerUI의 짝으로 조합한다.
 */
export function ContextMenuSubmenuContentUI({
  align = "start",
  side = "inline-end",
  sideOffset = 2,
  ref,
  ...props
}: ContextMenuUIContentProps) {
  return (
    <ContextMenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />
  );
}
