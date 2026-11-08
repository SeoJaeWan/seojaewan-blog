import type { ComponentProps, JSX } from 'react';

import { StartCategoryFolder } from '@seojaewan/design-system';

import type { StartCategoryDevice } from '@/features/start-menu/components/start-body/components/start-category-cards/start-category-cards';
import { StartTile } from '@/features/start-menu/components/start-body/components/start-tile/start-tile';
import type { StartItem } from '@/features/start-menu/utils/start-items/start-items';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartCategoryPopupProps = Omit<ComponentProps<typeof StartCategoryFolder>, 'children'> & {
  device: StartCategoryDevice;
  items: readonly StartItem[];
  onItemOpen?: (item: StartItem) => void;
  getMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
};

// 기기별 항목 칸 너비다. 데스크톱은 PinnedTile 기본(95), 모바일은 89로 고정됨 격자와 같다.
const tileClassNames = {
  desktop: undefined,
  mobile: 'w-size-pinned-tile-mobile-width',
} as const satisfies Record<StartCategoryDevice, string | undefined>;

/**
 * 범주 카드를 눌러 연 펼침 팝업(피그마 조립 `Start/CategoryFolder`)을 그린다. 범주 이름과 범주의 모든 항목을 아이콘·이름 격자로 놓고,
 * 넘치면 팝업 안에서 스크롤한다. 항목 칸을 누르면 그 항목으로 `onItemOpen`을 부른다.
 * 크기와 놓을 자리, 여닫기(카드 클릭, 바깥 클릭, Esc)는 쓰는 곳이 한다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 모바일은 항목 칸(89)이 좁다
 * @param props.items 범주의 모든 항목. 이름순이다
 * @param props.onItemOpen 항목 칸을 눌렀을 때 부른다
 * @param props.getMenuItems 항목 칸의 우클릭(모바일은 길게 누르기) 메뉴 항목(모두 목록 줄과 같은 메뉴)을 항목마다 정한다. 주지 않으면 메뉴가 없다
 */
export function StartCategoryPopup({
  device,
  items,
  onItemOpen: handleItemOpen,
  getMenuItems,
  ...folderProps
}: StartCategoryPopupProps): JSX.Element {
  return (
    <StartCategoryFolder {...folderProps}>
      {items.map(
        /**
         * 항목 칸 하나를 그린다.
         * @param item 항목
         * @returns StartTile
         */
        (item) => (
          <StartTile
            key={item.id}
            item={item}
            className={tileClassNames[device]}
            onItemOpen={handleItemOpen}
            menuItems={getMenuItems?.(item)}
          />
        ),
      )}
    </StartCategoryFolder>
  );
}
