import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';
import { useState } from 'react';

import { MenuPopup } from './menu-popup';

/** 메뉴가 기준 자리의 아래로 열렸는지 위로 열렸는지(피그마 메뉴 조립의 `Placement` 변형) */
export type MenuStoryPlacement = 'below' | 'above';

type MenuStoryProps = Pick<ComponentProps<typeof MenuPopup>, 'items' | 'width'> & {
  placement?: MenuStoryPlacement;
};

// Base UI 포커스 가드는 aria-hidden이면서 tabindex=0인 span이라 aria-hidden-focus에 걸린다.
// 외부 라이브러리 구조라 메뉴 스토리에서만 이 규칙을 끈다.
export const menuStoryA11y = {
  config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] },
};

// 피그마 `Placement` 변형이 있는 메뉴 조립 스토리의 args다. argTypes options에 피그마 변형 값을 모두 넣는다([[피그마 연동:스토리 규칙]]).
export const MENU_PLACEMENT_ARG_TYPES = {
  placement: { control: 'inline-radio', options: ['below', 'above'] },
} as const;

// Base UI 1.9.0 `Menu.Popup`은 실행 중에 `initialFocus`를 받지만 타입 선언에는 없어, 속성 객체로 넘겨 타입 검사를 지난다.
const noInitialFocus: Record<string, unknown> = { initialFocus: false };

// 열린 쪽마다 기준 자리를 놓는 무대다. 위로 열 때는 기준 자리를 화면 아래에 두어 메뉴가 위로 열릴 공간을 남긴다.
// 둘 다 Storybook `padded`와 같은 여백(spacing/lg)을 두어 메뉴를 정수 위치에 놓는다(`fullscreen` 배치로 쓴다).
const placementStageClassNames = {
  below: 'p-spacing-lg',
  above: 'flex h-screen flex-col justify-end p-spacing-lg',
} as const satisfies Record<MenuStoryPlacement, string>;

// 열린 쪽마다 Base UI Positioner에 줄 쪽이다.
const placementSides = {
  below: 'bottom',
  above: 'top',
} as const satisfies Record<MenuStoryPlacement, string>;

/**
 * 메뉴 조립 스토리용으로 스토리 루트 안에 열린 메뉴를 그린다. 열고 닫기는 기능을 구현할 때 붙이므로 언제나 열려 있다.
 * 팝업을 루트 안의 기준 요소로 포털하고, 포털 안에 그리므로 팝업에 캡처 대상을 표시한다([[피그마 연동:스토리 규칙]]).
 * 열릴 때 Base UI가 확대/축소 줄의 첫 버튼으로 포커스를 옮기면 포커스 링이 그려져 피그마 그림과 달라지므로 처음 포커스를 옮기지 않게 한다.
 * placement를 주면 그 쪽으로 메뉴를 열어(단추 줄이 열린 쪽에 따라 맨 위나 맨 아래로 간다) 무대에 여백을 두므로 `fullscreen` 배치로 쓴다.
 * 주지 않으면 아래로 열고 여백은 Storybook `padded` 배치가 준다.
 * @param props 컴포넌트 속성
 * @param props.items 메뉴 항목과 구분선. 위에서부터 그린다
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 * @param props.placement 메뉴를 기준 자리의 아래로 열지 위로 열지(피그마 `Placement`)
 */
export function MenuStory({ items, width, placement }: MenuStoryProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const menu = (
    <div ref={setAnchor}>
      {anchor !== null && (
        <BaseMenu.Root open modal={false}>
          <BaseMenu.Portal container={anchor}>
            <BaseMenu.Positioner
              anchor={anchor}
              side={placementSides[placement ?? 'below']}
              align="start"
              sideOffset={0}
            >
              <MenuPopup items={items} width={width} {...noInitialFocus} data-parity-target />
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
      )}
    </div>
  );
  return placement === undefined ? (
    menu
  ) : (
    <div className={placementStageClassNames[placement]}>{menu}</div>
  );
}
