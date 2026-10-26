import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';
import { useState } from 'react';

import { MenuPopup } from '@/shared/components/menu-popup/menu-popup';

type MenuStoryProps = Pick<
  ComponentProps<typeof MenuPopup>,
  'items' | 'className' | 'itemClassName'
>;

/**
 * 메뉴 조립 스토리용으로 스토리 루트 안에 열린 메뉴를 그린다. 열고 닫기는 기능을 구현할 때 붙이므로 언제나 열려 있다.
 * 팝업을 루트 안의 기준 요소로 포털하고, 포털 안에 그리므로 팝업에 캡처 대상을 표시한다([[피그마 연동:스토리 규칙]]).
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
              <MenuPopup {...props} data-parity-target />
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
      )}
    </div>
  );
}
