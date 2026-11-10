import {
  type AnimationEvent,
  type ComponentProps,
  type FocusEvent,
  type JSX,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEvent,
} from 'react';

import { StartCategoryFolder } from '@seojaewan/design-system';

import type { StartCategoryDevice } from '@/features/start-menu/components/start-body/components/start-category-cards/start-category-cards';
import {
  getCategoryPageCount,
  getCategoryPageOfTile,
  getNextCategoryPage,
} from '@/features/start-menu/components/start-body/components/start-category-popup/utils/category-pages/category-pages';
import { StartTile } from '@/features/start-menu/components/start-body/components/start-tile/start-tile';
import type { StartItem } from '@/features/start-menu/utils/start-items/start-items';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

type StartCategoryPopupProps = Omit<
  ComponentProps<typeof StartCategoryFolder>,
  'children' | 'hasPages' | 'pageCount' | 'currentPage' | 'gridProps'
> & {
  device: StartCategoryDevice;
  items: readonly StartItem[];
  onItemOpen?: (item: StartItem) => void;
  getMenuItems?: (item: StartItem) => readonly MenuPopupEntry[];
};

/** 넘기는 중인 방향. 다음 쪽은 격자가 위로, 앞 쪽은 아래로 미끄러진다 */
type PageTurn = 'next' | 'previous';

/**
 * 범주 카드를 눌러 연 펼침 팝업(피그마 조립 `Start/CategoryFolder`)을 그린다. 범주 이름과 범주의 모든 항목을 아이콘·이름 격자로 놓는다.
 * 크기는 StartCategoryFolder가 Device대로 정한다. 항목 칸을 누르면 그 항목으로 `onItemOpen`을 부른다.
 * 넘치면 스크롤바 없이 한 쪽(4열 × 3줄)씩 넘긴다.
 * - 휠을 한 번 굴리면 한 쪽 넘긴다. 넘기는 동안 들어온 휠은 버리고, 첫 쪽에서 앞으로·마지막 쪽에서 뒤로는 움직이지 않는다.
 * - 격자만 `motion-start-category-folder-page`로 한 쪽만큼 미끄러지고, 제목과 쪽 표시 점은 제자리다. 앞 쪽으로는 같은 움직임을 거꾸로 재생한다.
 * - 쪽 표시 점은 넘기기 시작하자마자 새 쪽을 크게 보인다.
 * - 키보드 포커스가 다른 쪽의 항목으로 옮겨 가면 움직임 없이 그 쪽을 보인다.
 * 놓을 자리와 여닫기(카드 클릭, 바깥 클릭, Esc)는 쓰는 곳이 한다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 Device. 팝업의 Device로 넘겨 너비·여백·항목 칸 너비를 고른다
 * @param props.items 범주의 모든 항목. 이름순이다
 * @param props.onItemOpen 항목 칸을 눌렀을 때 부른다
 * @param props.getMenuItems 항목 칸의 우클릭(모바일은 길게 누르기) 메뉴 항목(모두 목록 줄과 같은 메뉴)을 항목마다 정한다. 주지 않으면 메뉴가 없다
 * @param props.onWheel 팝업 위 휠 이벤트를 쓰는 곳도 받으려면 준다
 */
export function StartCategoryPopup({
  device,
  items,
  onItemOpen: handleItemOpen,
  getMenuItems,
  onWheel: handleWheelProp,
  ...folderProps
}: StartCategoryPopupProps): JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);
  const pageCount = getCategoryPageCount(items.length);
  // 쪽 표시 점이 보이는 쪽이다. 넘기기 시작하자마자 바뀐다.
  const [page, setPage] = useState(0);
  // 격자가 놓인 쪽이다. 다음 쪽으로는 움직임이 끝난 뒤, 앞 쪽으로는 거꾸로 재생하기 전에 바뀐다.
  const [restPage, setRestPage] = useState(0);
  const [turn, setTurn] = useState<PageTurn | null>(null);
  // 격자를 자르는 틀(피그마 page)의 높이다. 한 쪽(3줄)의 높이와 같다.
  const [pageHeight, setPageHeight] = useState(0);

  useLayoutEffect(
    /** 그려진 틀의 높이를 잰다. 팝업 크기는 Device마다 고정이라 처음 한 번만 잰다. */
    () => {
      setPageHeight(gridRef.current?.parentElement?.clientHeight ?? 0);
    },
    [],
  );

  useLayoutEffect(
    /**
     * 넘기기를 시작했는데 재생할 움직임이 없으면(동작 줄이기, 애니메이션이 없는 환경) 바로 끝낸다.
     * 움직임이 있으면 그 끝(animationend)에서 끝낸다.
     */
    () => {
      if (turn === null) {
        return;
      }
      const grid = gridRef.current;
      if (
        grid === null ||
        typeof grid.getAnimations !== 'function' ||
        grid.getAnimations().length === 0
      ) {
        setRestPage(page);
        setTurn(null);
      }
    },
    [turn, page],
  );

  /** 넘기기를 끝내고 격자를 새 쪽에 놓는다. */
  function finishTurn(): void {
    setRestPage(page);
    setTurn(null);
  }

  /**
   * 휠 한 번에 한 쪽 넘긴다. 넘기는 동안이나 더 넘길 쪽이 없으면 무시한다.
   * @param event 휠 이벤트
   */
  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    handleWheelProp?.(event);
    if (turn !== null) {
      return;
    }
    const nextPage = getNextCategoryPage(page, pageCount, event.deltaY);
    if (nextPage === page) {
      return;
    }
    setPage(nextPage);
    if (nextPage < page) {
      // 앞 쪽은 격자를 먼저 그 쪽에 놓고, 한 쪽만큼 아래에서 제자리로 오는 움직임(거꾸로 재생)을 건다.
      setRestPage(nextPage);
      setTurn('previous');
      return;
    }
    setTurn('next');
  }

  /**
   * 격자의 쪽 넘김 움직임이 끝나면 넘기기를 끝낸다. 안의 항목에서 올라온 이벤트는 넘긴다.
   * @param event 애니메이션 끝 이벤트
   */
  function handleGridAnimationEnd(event: AnimationEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget && turn !== null) {
      finishTurn();
    }
  }

  /**
   * 키보드 포커스가 다른 쪽의 항목으로 옮겨 가면 움직임 없이 그 쪽을 보인다.
   * @param event 포커스 이벤트
   */
  function handleGridFocus(event: FocusEvent<HTMLDivElement>): void {
    const tiles = Array.from(event.currentTarget.children);
    const index = tiles.findIndex((tile) => tile.contains(event.target));
    if (index < 0) {
      return;
    }
    const focusedPage = getCategoryPageOfTile(index);
    if (focusedPage !== page || focusedPage !== restPage) {
      setPage(focusedPage);
      setRestPage(focusedPage);
      setTurn(null);
    }
  }

  // 앞 쪽으로 넘길 때는 다음 쪽 움직임을 거꾸로 재생한다. 넘기는 방향은 휠을 굴린 방향으로 실행 중에 정해진다.
  const animationDirection = turn === 'previous' ? 'reverse' : 'normal';
  const restOffset = -restPage * pageHeight;

  return (
    <StartCategoryFolder
      {...folderProps}
      device={device}
      hasPages={pageCount > 1}
      pageCount={pageCount}
      currentPage={page}
      onWheel={handleWheel}
      gridProps={{
        ref: gridRef,
        className: turn === null ? undefined : 'motion-start-category-folder-page',
        style: { transform: `translateY(${String(restOffset)}px)`, animationDirection },
        onAnimationEnd: handleGridAnimationEnd,
        onFocus: handleGridFocus,
      }}
    >
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
            // 항목 칸 너비는 StartCategoryFolder가 Device대로 정한다.
            className={undefined}
            onItemOpen={handleItemOpen}
            menuItems={getMenuItems?.(item)}
          />
        ),
      )}
    </StartCategoryFolder>
  );
}
