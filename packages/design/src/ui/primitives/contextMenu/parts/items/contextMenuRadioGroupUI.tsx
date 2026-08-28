import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIRadioGroupProps } from "../../contextMenuUI.types";
import { toContextMenuUIChangeDetails } from "../../utils/contextMenuUIChangeDetails";

/**
 * 상호 배타적인 context radio item의 값·변경 event 범위를 구성한다.
 *
 * 제품 설정값의 영속화는 소유하지 않는다.
 */
export const ContextMenuRadioGroupUI = forwardRef<HTMLDivElement, ContextMenuUIRadioGroupProps>(
  function ContextMenuRadioGroupUI({ className, onValueChange, ...props }, ref) {
    return (
      <BaseContextMenu.RadioGroup
        {...props}
        className={clsx("wd-menu-ui__radio-group", className)}
        onValueChange={(value, details) =>
          onValueChange?.(String(value), toContextMenuUIChangeDetails(details.reason))
        }
        ref={ref}
      />
    );
  },
);
