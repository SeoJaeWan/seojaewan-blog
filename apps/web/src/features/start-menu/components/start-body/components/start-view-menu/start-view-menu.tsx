import type { JSX } from 'react';

import { DropDownButton } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartViewMenuProps = {
  /** 지금 고른 보기의 값 글자다(예: `간단히`). 버튼에는 `보기: 간단히`로 보인다 */
  label: string;
  /** 보기 메뉴(`Menu/ViewOptions`)가 열렸는지. 피그마 조립은 닫은 모양만 그리고 열림은 `@runtime`이다 */
  open?: boolean;
  /** 보기 메뉴를 열거나 닫으려 할 때 부른다. 쓰는 곳이 `open`을 바꾼다. 주지 않으면 `open`에 고정된다 */
  onOpenChange?: (isOpen: boolean) => void;
  /** 보기 메뉴 항목(피그마 `Menu/ViewOptions`) */
  menuItems: readonly MenuPopupEntry[];
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * Start 모두 목록의 보기 전환 버튼과 보기 메뉴(피그마 조립 `Start/ViewMenu`)를 그린다.
 * 버튼은 DropDownButton, 메뉴는 버튼 아래 끝 맞춤(피그마 Popover `Bottom-End`)으로 연다. 피그마처럼 메뉴 너비는 104이고 항목이 그 너비를 채운다.
 * 열고 닫기는 Base UI 메뉴가 `onOpenChange`로 알리고 쓰는 곳이 `open`을 바꾼다. 보기를 바꾸는 동작은 쓰는 곳이 `menuItems`로 준다.
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
        onOpenChange={props.onOpenChange}
        side="bottom"
        align="end"
        items={menuItems}
        width="view-options"
        trigger={<DropDownButton subject="보기" label={label} />}
      />
    </div>
  );
}
