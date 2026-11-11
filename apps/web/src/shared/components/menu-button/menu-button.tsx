import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX, ReactElement } from 'react';

import { getMenuPortalContainer, MenuPopup } from '@/shared/components/menu-popup/menu-popup';

type MenuButtonProps = Pick<ComponentProps<typeof MenuPopup>, 'items' | 'width' | 'finalFocus'> & {
  trigger: ReactElement;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
};

// 피그마 Popover의 트리거와 팝업 사이 간격(spacing/4)이다.
const POPUP_OFFSET = 4;

/**
 * 버튼과 그 버튼이 여는 메뉴 조립(`Menu/*`)을 한 쌍으로 그린다. Start 전원 버튼, Start 보기 버튼처럼 피그마 Popover에
 * 버튼과 메뉴를 넣은 조립에 쓴다. 메뉴는 MenuPopup이 그리고, 위치는 Base UI `Menu.Positioner`가 트리거에 맞춰 정한다.
 * 팝업은 문서 끝(body)에 포털해 트리거를 담은 영역의 `overflow`에 잘리지 않게 한다.
 * 닫힌 뒤 포커스가 갈 곳(`finalFocus`, Base UI `Menu.Popup`과 같다)을 주면 그대로 넘긴다. 주지 않으면 트리거로 돌아간다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:팝업]]
 * @param props 컴포넌트 속성
 * @param props.trigger 메뉴를 여는 버튼. Base UI `Menu.Trigger`가 이 요소에 열림 상태와 동작 속성을 합쳐 그린다
 * @param props.isOpen 메뉴가 열렸는지. 쓰는 곳이 정한다
 * @param props.side 피그마 Popover Placement의 쪽. 트리거의 위(top)나 아래(bottom)에 붙는다
 * @param props.align 피그마 Popover Placement의 끝 맞춤. 트리거의 시작(start)·가운데(center)·끝(end)에 맞춘다
 * @param props.sideOffset 트리거와 팝업 사이 간격(px). 없으면 피그마 Popover 간격이다. 피그마 그림이 이 간격과 다른 조립(경로 꺾쇠 목록)만 준다
 * @param props.alignOffset 끝 맞춤 방향으로 팝업을 미는 거리(px). 양수는 끝 쪽, 음수는 시작 쪽이다. 없으면 0이다
 * @param props.items 메뉴 항목과 구분선. 위에서부터 그린다
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 * @param props.finalFocus 메뉴가 닫힌 뒤 포커스가 갈 곳(Base UI `Menu.Popup`의 `finalFocus`). 주지 않으면 트리거로 돌아간다
 * @param props.onOpenChange 메뉴를 열거나 닫으려 할 때 부른다(트리거 클릭, Esc, 바깥 클릭, 항목 고르기). 쓰는 곳이 `isOpen`을 바꾼다. 주지 않으면 `isOpen`에 고정된다(조립 스토리)
 */
export function MenuButton({
  trigger,
  isOpen = false,
  side = 'bottom',
  align = 'start',
  sideOffset = POPUP_OFFSET,
  alignOffset,
  items,
  width,
  finalFocus,
  onOpenChange: handleOpenChange,
}: MenuButtonProps): JSX.Element {
  return (
    <BaseMenu.Root open={isOpen} modal={false} onOpenChange={handleOpenChange}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal container={getMenuPortalContainer()}>
        <BaseMenu.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
        >
          <MenuPopup items={items} width={width} finalFocus={finalFocus} />
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
