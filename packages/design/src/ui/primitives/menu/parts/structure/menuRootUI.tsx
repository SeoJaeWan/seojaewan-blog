import { Menu as BaseMenu } from "@base-ui/react/menu";

import type { MenuUIProps } from "../../menuUI.types";
import { toMenuUIChangeDetails } from "../../utils/toMenuUIChangeDetails";

/**
 * 버튼으로 여는 메뉴 전체의 열림 상태와 포커스 범위를 구성할 때 사용한다.
 *
 * 최상위에서 MenuTriggerUI와 MenuContentUI를 함께 감싸는 위치에 조합한다.
 */
export function MenuRootUI({ closeParentOnEscape, onOpenChange, ...props }: MenuUIProps) {
  return (
    <BaseMenu.Root
      {...props}
      closeParentOnEsc={closeParentOnEscape}
      onOpenChange={(open, details) => onOpenChange?.(open, toMenuUIChangeDetails(details))}
    />
  );
}
