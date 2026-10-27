import { ContextMenu } from '@base-ui/react/context-menu';
import type { ComponentProps, JSX, ReactElement } from 'react';
import { useState } from 'react';

import { MenuPopup } from '@/shared/components/menu-popup/menu-popup';

type ContextMenuAreaProps = Pick<
  ComponentProps<typeof MenuPopup>,
  'items' | 'className' | 'itemClassName'
> & {
  /**
   * 우클릭(모바일은 길게 누르기)을 받는 영역 요소. Base UI `ContextMenu.Trigger`가 이 요소에 여는 동작을 합쳐 그린다.
   * 요소의 ref와 이벤트 속성은 그대로 남는다
   */
  area: ReactElement;
  /** 메뉴가 열렸는지. 쓰는 곳이 정한다 */
  open: boolean;
  /**
   * 메뉴를 열거나 닫으려 할 때 부른다(우클릭, 길게 누르기, Esc, 바깥 클릭, 항목 고르기). 쓰는 곳이 `open`을 바꾼다.
   * 열 때는 우클릭·길게 누른 자리의 요소(`target`)를 함께 넘겨, 쓰는 곳이 어떤 메뉴를 보일지 정하게 한다
   */
  onOpenChange: (isOpen: boolean, target: Element | null) => void;
  /**
   * 메뉴가 닫힌 뒤 부른다. 메뉴 항목이 다른 곳에 포커스를 줄 일(이름 바꾸기 입력창)은 여기서 시작한다.
   * 그 뒤 포커스가 갈 곳이 없으면 메뉴를 열 때 포커스가 있던 요소로 돌아간다
   */
  onCloseComplete?: () => void;
};

/**
 * 영역을 우클릭하거나 길게 누르면(500ms, Base UI) 누른 자리 옆에 메뉴 조립(`Menu/*`)을 띄운다.
 * 바탕화면과 탐색기의 빈 곳·항목 메뉴에 쓴다. 메뉴 내용은 쓰는 곳이 연 자리(`target`)를 보고 정한다.
 * 키보드(Shift+F10, 메뉴 키)로 연 메뉴는 브라우저가 포커스된 요소에 보내는 `contextmenu` 이벤트로 열린다.
 * 닫힌 뒤 포커스는 Base UI가 옮기지 않고 여기서 정한다. 닫히고 나서 `onCloseComplete`를 부르고, 포커스가 갈 곳을 잃었으면(문서 끝)
 * 메뉴를 열 때 포커스가 있던 요소로 돌려준다. Base UI가 돌려주면 그 포커스가 메뉴 항목이 띄운 입력창(이름 바꾸기)보다 늦게 와
 * 입력창을 닫기 때문이다. 바깥을 눌러 닫았으면 누른 곳의 포커스를 그대로 둔다.
 * 팝업은 문서 끝(body)에 포털해 영역의 `overflow`에 잘리지 않게 한다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[바탕화면:아이콘 우클릭 메뉴]]
 * @codocs [[모바일:차이]]
 * @param props
 */
export function ContextMenuArea(props: ContextMenuAreaProps): JSX.Element {
  const {
    area,
    open: isOpen,
    onOpenChange,
    onCloseComplete,
    items,
    className,
    itemClassName,
  } = props;
  const [returnFocusElement, setReturnFocusElement] = useState<HTMLElement | null>(null);

  /**
   * 열림이 바뀐 것을 연 자리와 함께 쓰는 곳에 알린다.
   * @param isNextOpen 바뀐 열림 여부
   * @param details Base UI가 넘기는 바뀐 까닭과 이벤트
   */
  function handleOpenChange(
    isNextOpen: boolean,
    details: ContextMenu.Root.ChangeEventDetails,
  ): void {
    const target = details.event.target;
    if (isNextOpen) {
      const focused = document.activeElement;
      setReturnFocusElement(focused instanceof HTMLElement ? focused : null);
    }
    onOpenChange(isNextOpen, target instanceof Element ? target : null);
  }

  /**
   * 열고 닫기가 끝나면, 닫힌 경우 쓰는 곳에 알린다.
   * @param isNextOpen 끝난 열림 여부
   */
  function handleOpenChangeComplete(isNextOpen: boolean): void {
    if (isNextOpen) {
      return;
    }
    onCloseComplete?.();
    const isFocusLost = document.activeElement === null || document.activeElement === document.body;
    if (isFocusLost && returnFocusElement?.isConnected === true) {
      returnFocusElement.focus();
    }
  }

  return (
    <ContextMenu.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <ContextMenu.Trigger render={area} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <MenuPopup
            items={items}
            className={className}
            itemClassName={itemClassName}
            finalFocus={false}
          />
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
