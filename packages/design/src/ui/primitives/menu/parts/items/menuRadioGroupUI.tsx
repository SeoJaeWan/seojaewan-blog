import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIRadioGroupProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/toMenuUIChangeDetails";

/**
 * 여러 메뉴 값 가운데 하나만 선택해야 할 때 선택 범위를 구성한다.
 *
 * MenuContentUI 안에서 하나 이상의 MenuRadioItemUI를 감싸는 위치에 조합한다.
 */
export function MenuRadioGroupUI({
  className,
  onValueChange,
  ref,
  ...props
}: MenuUIRadioGroupProps) {
  return (
    <BaseMenu.RadioGroup
      {...props}
      className={clsx("wd-menu-ui__radio-group", className)}
      onValueChange={(value, details) =>
        onValueChange?.(String(value), toMenuUIChangeDetails(details))
      }
      ref={ref}
    />
  );
}
