import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIRadioGroupProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/toContextMenuUIChangeDetails";

/**
 * 문맥 메뉴의 여러 값 가운데 하나만 선택해야 할 때 선택 범위를 구성한다.
 *
 * ContextMenuContentUI 안에서 하나 이상의 ContextMenuRadioItemUI를 감싸 조합한다.
 */
export function ContextMenuRadioGroupUI({
  className,
  onValueChange,
  ref,
  ...props
}: ContextMenuUIRadioGroupProps) {
  return (
    <BaseContextMenu.RadioGroup
      {...props}
      className={clsx("wd-menu-ui__radio-group", "wd-context-menu-ui__radio-group", className)}
      onValueChange={(value, details) =>
        onValueChange?.(String(value), toContextMenuUIChangeDetails(details.reason))
      }
      ref={ref}
    />
  );
}
