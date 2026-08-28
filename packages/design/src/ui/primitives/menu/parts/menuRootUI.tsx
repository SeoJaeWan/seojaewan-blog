import { Menu as BaseMenu } from "@base-ui/react/menu";

import type { MenuUIProps } from "../menuUI.types";
import { toMenuUIChangeDetails } from "../menuUIChangeDetails";

/**
 * 보이는 trigger로 여는 menu의 상태와 focus 범위를 구성한다.
 * 제품 action의 의미나 실행 결과는 소유하지 않는다.
 */
export function MenuRootUI({ closeParentOnEscape, onOpenChange, ...props }: MenuUIProps) {
  return (
    <BaseMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toMenuUIChangeDetails(details.reason))}
    />
  );
}
