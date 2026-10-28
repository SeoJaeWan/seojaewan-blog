import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';
import { useState } from 'react';

import { MenuPopup } from '@/shared/components/menu-popup/menu-popup';

type MenuStoryProps = Pick<
  ComponentProps<typeof MenuPopup>,
  'items' | 'className' | 'itemClassName'
>;

// Base UI 1.9.0 `Menu.Popup`은 실행 중에 `initialFocus`를 받지만 타입 선언에는 없어, 속성 객체로 넘겨 타입 검사를 지난다.
const noInitialFocus: Record<string, unknown> = { initialFocus: false };

/**
 * 메뉴 조립 스토리용으로 스토리 루트 안에 열린 메뉴를 그린다. 열고 닫기는 기능을 구현할 때 붙이므로 언제나 열려 있다.
 * 팝업을 루트 안의 기준 요소로 포털하고, 포털 안에 그리므로 팝업에 캡처 대상을 표시한다([[피그마 연동:스토리 규칙]]).
 * 열릴 때 Base UI가 확대/축소 줄의 첫 버튼으로 포커스를 옮기면 포커스 링이 그려져 피그마 그림과 달라지므로 처음 포커스를 옮기지 않게 한다.
 * @param props
 */
export function MenuStory(props: MenuStoryProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAnchor}>
      {anchor !== null && (
        <BaseMenu.Root open modal={false}>
          <BaseMenu.Portal container={anchor}>
            <BaseMenu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={0}>
              <MenuPopup {...props} {...noInitialFocus} data-parity-target />
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
      )}
    </div>
  );
}
