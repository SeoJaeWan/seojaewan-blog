import type { JSX } from 'react';

import { DropDownButton } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartViewMenuProps = {
  label: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  menuItems: readonly MenuPopupEntry[];
  className?: string;
};

/**
 * Start 모두 목록의 보기 전환 버튼과 보기 메뉴(피그마 조립 `Start/ViewMenu`)를 그린다.
 * 버튼은 DropDownButton, 메뉴는 버튼 아래 끝 맞춤(피그마 Popover `Bottom-End`)으로 연다. 피그마처럼 메뉴 너비는 104이고 항목이 그 너비를 채운다.
 * 열고 닫기는 Base UI 메뉴가 `onOpenChange`로 알리고 쓰는 곳이 `isOpen`을 바꾼다. 보기를 바꾸는 동작은 쓰는 곳이 `menuItems`로 준다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[Start 메뉴:모두]]
 * @param props 컴포넌트 속성
 * @param props.label 지금 고른 보기의 값 글자다(예: `간단히`). 버튼에는 `보기: 간단히`로 보인다
 * @param props.isOpen 보기 메뉴(`Menu/ViewOptions`)가 열렸는지. 피그마 조립은 닫은 모양만 그리고 열림은 `@runtime`이다
 * @param props.menuItems 보기 메뉴 항목(피그마 `Menu/ViewOptions`)
 * @param props.className 바깥 배치 클래스
 * @param props.onOpenChange 보기 메뉴를 열거나 닫으려 할 때 부른다. 쓰는 곳이 `isOpen`을 바꾼다. 주지 않으면 `isOpen`에 고정된다
 */
export function StartViewMenu({
  label,
  isOpen = false,
  menuItems,
  className,
  onOpenChange: handleOpenChange,
}: StartViewMenuProps): JSX.Element {
  return (
    <div className={className === undefined ? 'flex' : `flex ${className}`}>
      <MenuButton
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        side="bottom"
        align="end"
        items={menuItems}
        width="view-options"
        trigger={<DropDownButton subject="보기" label={label} />}
      />
    </div>
  );
}
