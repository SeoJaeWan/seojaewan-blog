import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIRadioGroupProps } from "../menuUI.types";
import { toMenuUIChangeDetails } from "../menuUIChangeDetails";

/**
 * 상호 배타적인 radio item의 값·변경 event 범위를 구성한다.
 * 제품 설정값의 영속화는 소유하지 않는다.
 */
export const MenuRadioGroupUI = forwardRef<HTMLDivElement, MenuUIRadioGroupProps>(
  function MenuRadioGroupUI({ className, onValueChange, ...props }, ref) {
    return (
      <BaseMenu.RadioGroup
        {...props}
        className={clsx("wd-menu-ui__radio-group", className)}
        onValueChange={(value, details) =>
          onValueChange?.(String(value), toMenuUIChangeDetails(details.reason))
        }
        ref={ref}
      />
    );
  },
);
