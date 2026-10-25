import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX, ReactElement } from 'react';

import { MenuPopup } from './menu-popup';

type MenuButtonProps = Pick<
  ComponentProps<typeof MenuPopup>,
  'items' | 'className' | 'itemClassName'
> & {
  /** 메뉴를 여는 버튼. Base UI `Menu.Trigger`가 이 요소에 열림 상태와 동작 속성을 합쳐 그린다 */
  trigger: ReactElement;
  /** 메뉴가 열렸는지. 열고 닫기는 기능을 구현할 때 붙이므로 쓰는 곳이 정한다 */
  open?: boolean;
  /** 피그마 Popover Placement의 쪽. 트리거의 위(top)나 아래(bottom)에 붙는다 */
  side?: 'top' | 'bottom';
  /** 피그마 Popover Placement의 끝 맞춤. 트리거의 시작(start)·가운데(center)·끝(end)에 맞춘다 */
  align?: 'start' | 'center' | 'end';
};

// 피그마 Popover의 트리거와 팝업 사이 간격(spacing/4)이다.
const POPUP_OFFSET = 4;

/**
 * 버튼과 그 버튼이 여는 메뉴 조립(`Menu/*`)을 한 쌍으로 그린다. Start 전원 버튼, Start 보기 버튼처럼 피그마 Popover에
 * 버튼과 메뉴를 넣은 조립에 쓴다. 메뉴는 MenuPopup이 그리고, 위치는 Base UI `Menu.Positioner`가 트리거에 맞춰 정한다.
 * 팝업은 문서 끝(body)에 포털해 트리거를 담은 영역의 `overflow`에 잘리지 않게 한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @param props
 */
export function MenuButton(props: MenuButtonProps): JSX.Element {
  const {
    trigger,
    open: isOpen = false,
    side = 'bottom',
    align = 'start',
    items,
    className,
    itemClassName,
  } = props;
  return (
    <BaseMenu.Root open={isOpen} modal={false}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side={side} align={align} sideOffset={POPUP_OFFSET}>
          <MenuPopup items={items} className={className} itemClassName={itemClassName} />
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
