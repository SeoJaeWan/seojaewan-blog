import { Fragment, type JSX, useState } from 'react';

import { StartCategoryCard, type StartCategoryCardItems } from '@seojaewan/design-system';

import { renderItemIcon } from '@/features/start-menu/components/item-icon/item-icon';
import type {
  StartItem,
  StartItemGroup,
} from '@/features/start-menu/utils/start-items/start-items';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

export type StartCategoryDevice = 'desktop' | 'mobile';

type StartCategoryCardsProps = {
  device: StartCategoryDevice;
  groups: readonly StartItemGroup[];
  onItemOpen?: (item: StartItem) => void;
  getMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
};

// 카드 하나에 크게 그리는 앞 항목 수와 묶음에 작게 그리는 항목 수(2×2)다.
const LARGE_ICON_COUNT = 3;
const SMALL_ICON_COUNT = 4;

/**
 * 범주 항목 수로 카드의 피그마 `Items` 값을 고른다. 3개를 넘으면 큰 아이콘 3개와 묶음(`full`), 아니면 그 수만큼 큰 아이콘만 둔다.
 * @param count 범주의 항목 수(1 이상)
 * @returns 카드의 Items 값
 */
function categoryCardItems(count: number): StartCategoryCardItems {
  if (count > LARGE_ICON_COUNT) {
    return 'full';
  }
  return count === 1 ? '1' : count === 2 ? '2' : '3';
}

/**
 * 범주 보기의 카드 격자(피그마 `Start/Body` `View=Category`의 `cards`)를 그린다. 범주(종류)마다 카드 하나를 4열로 놓는다.
 * 카드 안에는 범주 안 이름순 앞 3개를 큰 아이콘으로, 나머지를 작은 아이콘 묶음으로 놓는다. 큰 아이콘을 누르면 그 항목을 연다.
 * 묶음·빈 곳을 눌러 펼침 팝업(`Start/CategoryFolder`)을 여는 일은 여기서 하지 않는다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 카드 여백과 아이콘 크기를 고른다
 * @param props.groups 범주로 묶은 모두 목록. 항목이 없는 범주는 없다
 * @param props.onItemOpen 큰 아이콘을 눌렀을 때 그 항목으로 부른다
 * @param props.getMenuItems 큰 아이콘의 우클릭(모바일은 길게 누르기) 메뉴 항목(모두 목록 줄과 같은 메뉴)을 항목마다 정한다. 주지 않으면 메뉴가 없다
 */
export function StartCategoryCards({
  device,
  groups,
  onItemOpen: handleItemOpen,
  getMenuItems,
}: StartCategoryCardsProps): JSX.Element {
  /**
   * 큰 아이콘 하나를 그린다.
   * @param item 항목
   * @returns 아이콘 버튼. 항목이 없으면 undefined
   */
  function renderLargeIcon(item: StartItem | undefined): JSX.Element | undefined {
    if (item === undefined) {
      return undefined;
    }
    return (
      <StartCategoryIconButton
        item={item}
        onItemOpen={handleItemOpen}
        menuItems={getMenuItems?.(item)}
      />
    );
  }

  return (
    <div className="flex w-full shrink-shrink-none items-start gap-spacing-lg">
      {groups.map(
        /**
         * 범주 하나의 카드를 그린다.
         * @param group 범주
         * @returns StartCategoryCard
         */
        (group) => {
          const [first, second, third] = group.items;
          const restItems = group.items.slice(
            LARGE_ICON_COUNT,
            LARGE_ICON_COUNT + SMALL_ICON_COUNT,
          );
          return (
            <StartCategoryCard
              key={group.label}
              device={device}
              items={categoryCardItems(group.items.length)}
              label={group.label}
              icon1={renderLargeIcon(first)}
              icon2={renderLargeIcon(second)}
              icon3={renderLargeIcon(third)}
              group={restItems.map((item) => (
                <Fragment key={item.id}>{renderItemIcon(item)}</Fragment>
              ))}
              className="min-w-size-none flex-flex-fill"
            />
          );
        },
      )}
    </div>
  );
}

type StartCategoryIconButtonProps = {
  item: StartItem;
  onItemOpen?: (item: StartItem) => void;
  menuItems?: readonly MenuPopupEntry[];
};

/**
 * 범주 카드의 큰 아이콘 하나를 누를 수 있는 버튼으로 그린다. 아이콘 칸의 크기를 채우고, 누르면 그 항목을 연다.
 * 메뉴 항목을 주면 우클릭(모바일은 길게 누르기, 키보드는 Shift+F10·메뉴 키)할 때 그 메뉴를 띄운다.
 * @codocs [[Start 메뉴:모두]]
 * @param props 컴포넌트 속성
 * @param props.item 항목
 * @param props.menuItems 우클릭 메뉴 항목. 주지 않으면 메뉴가 없다
 * @param props.onItemOpen 눌렀을 때 부른다
 */
function StartCategoryIconButton({
  item,
  menuItems,
  onItemOpen: handleItemOpen,
}: StartCategoryIconButtonProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /** 누르면 쓰는 곳에 항목을 알린다. */
  function handleClick(): void {
    handleItemOpen?.(item);
  }

  /**
   * 메뉴가 열리거나 닫히면 상태를 맞춘다.
   * @param isOpen 열렸는지
   */
  function handleMenuOpenChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  const button = (
    <button
      type="button"
      aria-label={item.title}
      className="cursor-pointer [&>*]:size-full [&>*]:object-contain"
      onClick={handleClick}
    >
      {renderItemIcon(item)}
    </button>
  );
  if (menuItems === undefined) {
    return button;
  }
  return (
    <ContextMenuArea
      isOpen={isMenuOpen}
      onOpenChange={handleMenuOpenChange}
      items={menuItems}
      area={button}
    />
  );
}
