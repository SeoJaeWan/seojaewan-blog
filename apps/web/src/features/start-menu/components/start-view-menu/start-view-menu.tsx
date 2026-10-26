import type { JSX } from 'react';

import { DropDownButton } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartViewMenuProps = {
  /** 버튼 글자. 지금 고른 보기다(예: `보기: 간단히`) */
  label: string;
  /** 피그마 State. true면 보기 메뉴(`Menu/ViewOptions`)를 연 모습(Open), false면 버튼만 보인다(Closed) */
  open?: boolean;
  /** 보기 메뉴 항목(피그마 `Menu/ViewOptions`) */
  menuItems: readonly MenuPopupEntry[];
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * Start 모두 목록의 보기 전환 버튼과 보기 메뉴(피그마 조립 `Start/ViewMenu`)를 그린다.
 * 버튼은 DropDownButton, 메뉴는 버튼 아래 끝 맞춤(피그마 Popover `Bottom-End`)으로 연다. 피그마처럼 메뉴 너비는 104이고 항목이 그 너비를 채운다.
 * 열고 닫기와 보기 바꾸기는 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Start 메뉴:모두]]
 * @param props
 */
export function StartViewMenu(props: StartViewMenuProps): JSX.Element {
  const { label, open: isOpen = false, menuItems, className } = props;
  return (
    <div className={className === undefined ? 'flex' : `flex ${className}`}>
      <MenuButton
        open={isOpen}
        side="bottom"
        align="end"
        items={menuItems}
        className="w-104"
        itemClassName="w-full"
        trigger={<DropDownButton label={label} />}
      />
    </div>
  );
}
