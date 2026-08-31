import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUISeparatorProps } from "../../menuUI.types";

/**
 * 서로 다른 의미의 메뉴 항목 묶음을 시각적·의미적으로 나눌 때 사용한다.
 *
 * MenuContentUI 안에서 나누려는 두 항목 묶음 사이에 조합한다.
 */
export function MenuSeparatorUI({ className, ref, ...props }: MenuUISeparatorProps) {
  return (
    <BaseMenu.Separator {...props} className={clsx("wd-menu-ui__separator", className)} ref={ref} />
  );
}
