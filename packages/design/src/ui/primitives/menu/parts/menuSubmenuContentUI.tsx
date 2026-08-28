import { forwardRef } from "react";

import type { MenuUIContentProps } from "../menuUI.types";
import { MenuContentUI } from "./menuContentUI";

/**
 * 중첩 menu의 role과 기본 배치를 제공한다.
 * 하위 item의 제품 구성은 결정하지 않는다.
 */
export const MenuSubmenuContentUI = forwardRef<HTMLDivElement, MenuUIContentProps>(
  function MenuSubmenuContentUI(
    { align = "start", side = "inline-end", sideOffset = 2, ...props },
    ref,
  ) {
    return <MenuContentUI {...props} align={align} ref={ref} side={side} sideOffset={sideOffset} />;
  },
);
