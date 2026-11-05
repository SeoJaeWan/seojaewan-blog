import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Flyout } from '../flyout/flyout';

// children은 메뉴 항목(MenuItem 등)이다. 피그마에서는 조립이 Flyout의 Content 슬롯을 채운다.
type MenuProps = ComponentProps<'div'>;

/**
 * 메뉴 항목을 담는 떠 있는 메뉴 바탕(피그마 Menu)을 그린다. Flyout(아크릴) 위에 메뉴 너비를 더한다.
 * Base UI 메뉴 안에서는 `Menu.Popup`의 `render`로 넘겨 팝업 요소로 쓴다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Menu({ className, ...flyoutProps }: MenuProps): JSX.Element {
  return <Flyout {...flyoutProps} className={cn('w-size-menu-width', className)} />;
}
