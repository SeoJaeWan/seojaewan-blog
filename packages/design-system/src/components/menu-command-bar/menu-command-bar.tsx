import { Menu } from '@base-ui/react/menu';
import { Children, type JSX, type ReactNode } from 'react';

import { cn } from '../../cn';
import { Separator } from '../separator/separator';

type MenuCommandBarProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * 메뉴의 단추 줄(피그마 MenuCommandBar)을 그린다. 잘라내기·삭제처럼 자주 쓰는 명령 단추(MenuCommandButton)를 가로로 놓고
 * 단추 사이에 세로 Separator를 둔다. Base UI Menu의 Popup 안에 둔다.
 * 메뉴가 아래로 열리면 맨 위, 위로 열리면 맨 아래에 놓는 일은 쓰는 곳(앱의 메뉴)이 정하고, 이 컴포넌트는 줄 모양만 그린다.
 * 너비는 쓰는 곳이 정하고 단추가 남는 너비를 나눠 채운다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.children 단추 줄에 놓을 MenuCommandButton들(피그마 Items 슬롯). 사이마다 구분선을 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function MenuCommandBar({ children, className }: MenuCommandBarProps): JSX.Element {
  const items: ReactNode[] = [];
  for (const [index, button] of Children.toArray(children).entries()) {
    if (index > 0) {
      // 피그마 separator 프레임: 위아래 spacing/sm-nudge를 띄우고 단추 높이를 따라 채운다.
      items.push(
        <Separator
          key={`separator-${index}`}
          orientation="vertical"
          className="my-spacing-sm-nudge h-auto self-stretch"
        />,
      );
    }
    items.push(button);
  }
  return (
    <Menu.Group
      className={cn(
        'flex items-center px-spacing-xs py-spacing-2xs',
        // 단추는 남는 너비를 나눠 채운다. 구분선은 늘어나지 않는다.
        '[&>:not([role=separator])]:min-w-size-none [&>:not([role=separator])]:flex-flex-fill',
        className,
      )}
    >
      {items}
    </Menu.Group>
  );
}
