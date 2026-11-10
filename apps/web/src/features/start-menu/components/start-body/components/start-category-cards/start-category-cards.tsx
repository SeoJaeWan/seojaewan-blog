import { Popover as BasePopover } from '@base-ui/react/popover';
import { Fragment, type JSX, type MouseEvent, useEffect, useRef, useState } from 'react';

import { StartCategoryCard, type StartCategoryCardItems } from '@seojaewan/design-system';

import { renderItemIcon } from '@/features/start-menu/components/item-icon/item-icon';
import { StartCategoryPopup } from '@/features/start-menu/components/start-body/components/start-category-popup/start-category-popup';
import { START_MENU_PANEL_SELECTOR } from '@/features/start-menu/components/start-menu-panel/start-menu-panel';
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

/** 펼침 팝업을 연 범주와 놓은 자리다 */
type OpenedCategory = {
  label: string;
  // 팝업을 가운데에 놓는 기준 요소(Start 패널. 패널 밖에서 그리면 카드 격자)
  anchor: HTMLElement;
  // 팝업 가운데에서 누른 카드의 아이콘·이름 가운데까지의 거리(px). 열고 닫는 움직임의 출발·도착 위치다
  offsetX: number;
  offsetY: number;
};

// 열기·닫기 모션(motion-start-category-folder-open·close)이 출발·도착 위치로 읽는 실행 중 값이다.
const OFFSET_X_VARIABLE = '--motion-category-folder-offset-x';
const OFFSET_Y_VARIABLE = '--motion-category-folder-offset-y';

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
 * 요소의 가운데 점을 잰다.
 * @param element 요소
 * @returns 화면 기준 가운데 점(px)
 */
function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * 범주 보기의 카드 격자(피그마 `Start/Body` `View=Category`의 `cards`)를 그린다. 범주(종류)마다 카드 하나를 4열로 놓는다.
 * 카드 안에는 범주 안 이름순 앞 3개를 큰 아이콘으로, 나머지를 작은 아이콘 묶음으로 놓는다. 큰 아이콘을 누르면 그 항목을 연다.
 * 묶음이나 카드의 빈 곳(큰 아이콘 밖)을 누르면 펼침 팝업(`Start/CategoryFolder`)을 연다.
 * - 팝업은 Base UI Popover라 바깥을 누르거나 Esc를 누르면 닫히고, Start 패널 안의 팝업으로 보아 Esc는 팝업만 닫는다.
 * - 자리: 누른 카드와 상관없이 Start 패널의 가로·세로 정가운데다.
 * - 크기: 팝업(StartCategoryFolder)이 Device마다 정한 고정 크기다. 넘치면 팝업이 한 쪽씩 넘긴다(StartCategoryPopup).
 * - 열기는 누른 카드의 아이콘·이름 가운데에서 한 장처럼 커지며 가운데로 오고(`motion-start-category-folder-open`),
 *   닫기는 그 카드 자리로 줄어든다(`motion-start-category-folder-close`). 열린 채 다른 카드를 누르면 움직임 없이 닫히기만 한다.
 * - 팝업의 항목 칸은 누르면 그 항목을 열고, 모두 목록과 같은 우클릭(길게 누르기) 메뉴가 있다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 카드 여백과 아이콘 크기, 팝업 너비를 고른다
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
  const rowRef = useRef<HTMLDivElement>(null);
  // 팝업이 열려 있는지와, 닫히는 움직임 동안에도 그릴 마지막으로 연 범주다.
  const [isOpen, setIsOpen] = useState(false);
  const [opened, setOpened] = useState<OpenedCategory | null>(null);
  // 열린 채 다른 카드를 눌러 닫을 때는 닫는 움직임 없이 닫는다.
  const [isClosingInstantly, setIsClosingInstantly] = useState(false);
  // 열린 팝업을 닫은 카드 누르기면 true다. 뒤따르는 클릭이 그 카드의 팝업을 열지 않게 한다.
  const isCardClickSuppressedRef = useRef(false);
  const openedGroup = groups.find((group) => group.label === opened?.label);

  /**
   * 묶음이나 카드의 빈 곳을 누르면 그 범주의 펼침 팝업을 연다. 큰 아이콘(버튼)을 누른 것은 넘긴다.
   * 카드 DOM 밖에서 온 클릭(큰 아이콘의 우클릭 메뉴는 포털이지만 React 트리로 카드까지 올라온다)도 넘긴다.
   * @param event 누르기 이벤트
   * @param label 범주 이름
   */
  function handleCardClick(event: MouseEvent<HTMLDivElement>, label: string): void {
    const target = event.target;
    const card = event.currentTarget;
    if (isCardClickSuppressedRef.current) {
      isCardClickSuppressedRef.current = false;
      return;
    }
    if (
      !(target instanceof Element) ||
      !card.contains(target) ||
      target.closest('button') !== null
    ) {
      return;
    }
    const anchor = card.closest<HTMLElement>(START_MENU_PANEL_SELECTOR) ?? rowRef.current ?? card;
    const from = centerOf(card);
    const to = centerOf(anchor);
    setIsClosingInstantly(false);
    setOpened({ label, anchor, offsetX: from.x - to.x, offsetY: from.y - to.y });
    setIsOpen(true);
  }

  useEffect(
    /**
     * 팝업이 열린 동안 Esc는 팝업만 닫는다. Start 패널(Base UI Dialog)도 문서에서 Esc를 받아 닫히므로, 창(window)의 붙잡기 단계에서
     * 먼저 받아 더 퍼지지 않게 한다. 팝업 안 항목의 우클릭 메뉴가 열려 있으면 메뉴가 Esc를 받도록 넘긴다.
     * @returns 이벤트를 떼는 정리 함수
     */
    () => {
      if (!isOpen) {
        return undefined;
      }
      /**
       * Esc를 받아 팝업을 닫는다.
       * @param event 키 이벤트
       */
      function handleEscape(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || document.querySelector('[role="menu"]') !== null) {
          return;
        }
        event.stopPropagation();
        setIsOpen(false);
      }
      window.addEventListener('keydown', handleEscape, true);
      return () => {
        window.removeEventListener('keydown', handleEscape, true);
      };
    },
    [isOpen],
  );

  /**
   * Base UI가 바깥 누르기로 닫으라고 알리면 닫는다. 다른 카드를 눌러 닫으면 움직임 없이 닫고, 뒤따르는 클릭이 그 카드의 팝업을
   * 열지 않게 한다.
   * @param isNextOpen 열지
   * @param details 바뀐 까닭과 이벤트
   * @param details.event 닫게 한 이벤트
   */
  function handlePopupOpenChange(isNextOpen: boolean, details: { event: Event }): void {
    if (isNextOpen) {
      return;
    }
    const target = details.event.target;
    const card = target instanceof Element ? target.closest('[data-start-category-card]') : null;
    if (card !== null && rowRef.current?.contains(card) === true) {
      isCardClickSuppressedRef.current = true;
      setIsClosingInstantly(true);
    }
    setIsOpen(false);
  }

  /**
   * 닫는 움직임까지 끝나면 그리던 범주를 비운다.
   * @param isNextOpen 열렸는지
   */
  function handlePopupOpenChangeComplete(isNextOpen: boolean): void {
    if (!isNextOpen) {
      setOpened(null);
    }
  }

  /**
   * 팝업의 항목을 열면 팝업을 닫고 쓰는 곳에 알린다.
   * @param item 연 항목
   */
  function handlePopupItemOpen(item: StartItem): void {
    setIsOpen(false);
    handleItemOpen?.(item);
  }
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

  /**
   * 열고 닫는 움직임 클래스를 고른다. 다른 카드를 눌러 닫을 때는 움직임이 없다.
   * @param state Base UI 팝업 상태
   * @param state.transitionStatus 열리는 중·닫히는 중
   * @returns 팝업 클래스
   */
  function popupClassName(state: { transitionStatus: string | undefined }): string {
    if (state.transitionStatus === 'ending') {
      return isClosingInstantly
        ? 'outline-none'
        : 'motion-start-category-folder-close outline-none';
    }
    return 'motion-start-category-folder-open outline-none';
  }

  /**
   * 그려진 팝업에 열고 닫는 움직임의 출발·도착 위치(실행 중 값)를 CSS 변수로 넘긴다.
   * @param popup 팝업 요소. 빠질 때 null이다
   */
  function applyMotionOffset(popup: HTMLDivElement | null): void {
    if (popup === null || opened === null) {
      return;
    }
    popup.style.setProperty(OFFSET_X_VARIABLE, `${String(opened.offsetX)}px`);
    popup.style.setProperty(OFFSET_Y_VARIABLE, `${String(opened.offsetY)}px`);
  }

  return (
    <div ref={rowRef} className="flex w-full shrink-shrink-none items-start gap-spacing-lg">
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
              className="min-w-size-none flex-flex-fill cursor-pointer"
              data-start-category-card=""
              data-category-open={isOpen && opened?.label === group.label ? '' : undefined}
              onClick={(event: MouseEvent<HTMLDivElement>) => {
                handleCardClick(event, group.label);
              }}
            />
          );
        },
      )}
      {/* 팝업을 연 동안과 닫히는 움직임 동안 Popover를 둔다. */}
      {openedGroup !== undefined && opened !== null && (
        <BasePopover.Root
          open={isOpen}
          onOpenChange={handlePopupOpenChange}
          onOpenChangeComplete={handlePopupOpenChangeComplete}
        >
          <BasePopover.Portal>
            <BasePopover.Positioner
              anchor={opened.anchor}
              side="bottom"
              align="center"
              sideOffset={placeAtAnchorCenter}
              collisionPadding={0}
              collisionAvoidance={{ side: 'none', align: 'none', fallbackAxisSide: 'none' }}
              // 패널 층(pointer-events-none) 안에 그려지므로 입력을 다시 받게 한다.
              className="pointer-events-auto z-layer-popover"
            >
              <BasePopover.Popup
                aria-label={openedGroup.label}
                ref={applyMotionOffset}
                className={popupClassName}
              >
                <StartCategoryPopup
                  device={device}
                  label={openedGroup.label}
                  items={openedGroup.items}
                  onItemOpen={handlePopupItemOpen}
                  getMenuItems={getMenuItems}
                />
              </BasePopover.Popup>
            </BasePopover.Positioner>
          </BasePopover.Portal>
        </BasePopover.Root>
      )}
    </div>
  );
}

/**
 * 팝업 가운데를 기준 요소(Start 패널) 가운데에 맞추도록, 기준 요소 아래쪽에서 두 높이 합의 절반만큼 위로 올린다.
 * @param data Base UI가 넘기는 자리 정보
 * @param data.anchor 기준 요소 크기
 * @param data.anchor.height 기준 요소 높이
 * @param data.positioner 팝업 크기
 * @param data.positioner.height 팝업 높이
 * @returns 기준 요소와 팝업 사이 거리(px)
 */
function placeAtAnchorCenter({
  anchor,
  positioner,
}: {
  anchor: { height: number };
  positioner: { height: number };
}): number {
  return -(anchor.height + positioner.height) / 2;
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
