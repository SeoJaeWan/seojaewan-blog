import type { JSX, PointerEvent } from 'react';
import { useState } from 'react';

import { PinnedTile } from '@seojaewan/design-system';

import { renderItemIcon } from '@/features/start-menu/components/item-icon/item-icon';
import type { StartItem } from '@/features/start-menu/components/start-body/start-body';
import { START_TILE_ID_ATTRIBUTE } from '@/features/start-menu/utils/start-items/start-items';
import { ContextMenuArea } from '@/shared/components/context-menu-area/context-menu-area';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartTileProps = {
  /** 항목 */
  item: StartItem;
  /** 칸 너비 클래스 */
  className: string | undefined;
  /** 칸을 눌렀을 때 부른다 */
  onItemOpen?: (item: StartItem) => void;
  /** 우클릭(모바일은 길게 누르기) 메뉴 항목(피그마 `Menu/StartTile`). 주지 않으면 메뉴가 없다 */
  menuItems?: readonly MenuPopupEntry[];
  /** 칸 위에서 포인터를 눌렀을 때 부른다. 쓰는 곳이 끌어 순서 바꾸기를 시작한다 */
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>, item: StartItem) => void;
  /** 끌기 뒤에 따라오는 클릭인지 쓰는 곳에 묻는다. 맞으면 항목을 열지 않는다 */
  shouldSuppressClick?: () => boolean;
};

/**
 * 항목 칸 하나(PinnedTile)를 그린다. 누르면 그 항목으로 `onItemOpen`을 부른다. 메뉴 항목을 주면 칸을 우클릭(모바일은 길게 누르기)할 때
 * 그 메뉴를 칸 옆에 띄운다. 끌어 순서를 바꾼 뒤에 따라오는 클릭은 항목을 열지 않는다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param props
 */
export function StartTile(props: StartTileProps): JSX.Element {
  const { item, className, menuItems, shouldSuppressClick } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /** 칸을 누르면 쓰는 곳에 항목을 알린다. 끌기 뒤의 클릭은 넘긴다. */
  function handleClick(): void {
    if (shouldSuppressClick?.() === true) {
      return;
    }
    props.onItemOpen?.(item);
  }

  /**
   * 칸 위에서 포인터를 누르면 쓰는 곳에 알린다.
   * @param event 포인터 이벤트
   */
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    props.onPointerDown?.(event, item);
  }

  /**
   * 메뉴가 열리거나 닫히면 상태를 맞춘다.
   * @param isOpen 열렸는지
   */
  function handleMenuOpenChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  const tile = (
    <PinnedTile
      {...{ [START_TILE_ID_ATTRIBUTE]: item.id }}
      label={item.title}
      icon={renderItemIcon(item)}
      className={className}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    />
  );
  if (menuItems === undefined) {
    return tile;
  }
  return (
    <ContextMenuArea
      open={isMenuOpen}
      onOpenChange={handleMenuOpenChange}
      items={menuItems}
      area={tile}
    />
  );
}
