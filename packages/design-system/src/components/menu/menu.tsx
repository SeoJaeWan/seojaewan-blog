import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Flyout, type FlyoutMaterial } from '../flyout/flyout';

// children은 메뉴 항목(MenuItem 등)이다. 피그마에서는 조립이 Flyout의 Content 슬롯을 채운다.
type MenuProps = ComponentProps<'div'> & {
  /** 피그마에서 노출한 Flyout의 Material. 바탕 재질을 바꾼다 */
  material?: FlyoutMaterial;
};

/**
 * 메뉴 항목을 담는 떠 있는 메뉴 바탕(피그마 Menu)을 그린다. Flyout(`Padding=Compact`) 위에 메뉴 너비를 더한다.
 * Base UI 메뉴 안에서는 `Menu.Popup`의 `render`로 넘겨 팝업 요소로 쓴다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function Menu(props: MenuProps): JSX.Element {
  const { material, className, ...flyoutProps } = props;
  return (
    <Flyout
      {...flyoutProps}
      material={material}
      padding="compact"
      className={cn('w-250', className)}
    />
  );
}
