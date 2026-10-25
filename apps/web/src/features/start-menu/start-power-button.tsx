import type { JSX } from 'react';

import { IconButton } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/menu/menu-button';
import type { MenuPopupEntry } from '@/shared/menu/menu-popup';

type StartPowerButtonProps = {
  /** 피그마 State. true면 전원 메뉴(`Menu/Power`)를 연 모습(Open), false면 버튼만 보인다(Closed) */
  open?: boolean;
  /** 전원 메뉴 항목(피그마 `Menu/Power`) */
  menuItems: readonly MenuPopupEntry[];
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * Start 아래 줄의 전원 버튼과 전원 메뉴(피그마 조립 `Start/PowerButton`)를 그린다.
 * 버튼은 Subtle IconButton, 메뉴는 버튼 위 끝 맞춤(피그마 Popover `Top-End`)으로 연다.
 * 열고 닫기와 `다시 시작` 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Start 메뉴:구성]]
 * @param props
 */
export function StartPowerButton(props: StartPowerButtonProps): JSX.Element {
  const { open: isOpen = false, menuItems, className } = props;
  return (
    <div className={className === undefined ? 'flex' : `flex ${className}`}>
      <MenuButton
        open={isOpen}
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
