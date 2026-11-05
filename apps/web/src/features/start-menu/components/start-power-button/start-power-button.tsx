import type { JSX } from 'react';

import { IconButton } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartPowerButtonProps = {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  menuItems: readonly MenuPopupEntry[];
  className?: string;
};

/**
 * Start 아래 줄의 전원 버튼과 전원 메뉴(피그마 조립 `Start/PowerButton`)를 그린다.
 * 버튼은 Subtle IconButton, 메뉴는 버튼 위 끝 맞춤(피그마 Popover `Top-End`)으로 연다.
 * 열고 닫기는 Base UI 메뉴가 `onOpenChange`로 알리고 쓰는 곳이 `isOpen`을 바꾼다. 항목의 동작은 쓰는 곳이 `menuItems`로 준다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Start 메뉴:구성]]
 * @param props 컴포넌트 속성
 * @param props.isOpen 전원 메뉴(`Menu/Power`)가 열렸는지. 피그마 조립은 닫은 모양만 그리고 열림은 `@runtime`이다
 * @param props.menuItems 전원 메뉴 항목(피그마 `Menu/Power`)
 * @param props.className 바깥 배치 클래스
 * @param props.onOpenChange 전원 메뉴를 열거나 닫으려 할 때 부른다. 쓰는 곳이 `isOpen`을 바꾼다. 주지 않으면 `isOpen`에 고정된다
 */
export function StartPowerButton({
  isOpen = false,
  menuItems,
  className,
  onOpenChange: handleOpenChange,
}: StartPowerButtonProps): JSX.Element {
  return (
    <div className={className === undefined ? 'flex' : `flex ${className}`}>
      <MenuButton
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        side="top"
        align="end"
        items={menuItems}
        trigger={
          <IconButton variant="subtle" label="전원" icon="icons/ic_fluent_power_20_regular.svg" />
        }
      />
    </div>
  );
}
