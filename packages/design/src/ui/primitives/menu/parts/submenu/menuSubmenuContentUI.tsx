import type { MenuUIContentProps } from "../../menuUI.types";
import { MenuContentUI } from "../structure/menuContentUI";

/**
 * 중첩 메뉴의 항목을 별도 popup으로 표시할 때 사용한다.
 *
 * MenuSubmenuRootUI 안에서 MenuSubmenuTriggerUI의 짝으로 조합한다.
 */
export function MenuSubmenuContentUI({
  align = "start",
  side = "inline-end",
  sideOffset = 2,
  ref,
  ...props
}: MenuUIContentProps) {
  return <MenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />;
}
