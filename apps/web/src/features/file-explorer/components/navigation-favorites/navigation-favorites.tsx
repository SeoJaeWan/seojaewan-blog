import { Fragment, type JSX, type ReactNode } from 'react';

import { Separator } from '@seojaewan/design-system';

import {
  FAVORITES_AREA_ATTRIBUTE,
  FAVORITES_END_ATTRIBUTE,
} from '@/shared/hooks/use-item-drag/use-item-drag';

/** 즐겨찾기 칸 하나. key는 칸을 구분하는 열쇠다 */
type FavoriteEntry = {
  key: string;
  item: ReactNode;
};

type NavigationFavoritesProps = {
  areaId: string;
  items: readonly FavoriteEntry[];
  dropSlot: number | null;
};

/**
 * 탐색 창 맨 위의 즐겨찾기(피그마 조립 `Explorer/FavoritesDrag`의 탐색 창 윗부분)를 그린다. 즐겨찾기 칸, 그 아래 구분선 차례다.
 * 즐겨찾기가 비면 칸과 구분선을 모두 숨긴다. 끄는 항목을 놓을 자리에는 칸 사이 경계에 가로선을 겹쳐 그린다(칸 배치는 그대로다).
 * 구분선 자리는 즐겨찾기 맨 뒤 놓을 자리다. 칸의 위·아래 끝 놓을 자리는 칸이 단 속성으로 끌기 훅이 찾는다.
 * @codocs [[파일 탐색기:탐색 창]]
 * @codocs [[디자인 시스템:조립]]
 * @param props 컴포넌트 속성
 * @param props.areaId 즐겨찾기 영역 id(탐색기 창 id). 끌기 훅이 놓을 자리를 이 창의 것으로 알린다
 * @param props.items 즐겨찾기 칸(NavigationItem, 압정 있음)과 열쇠. 고정한 차례다
 * @param props.dropSlot 가로선을 그릴 놓을 자리(그 차례의 칸 바로 앞, 칸 수면 맨 뒤). 없으면 null
 * @returns 즐겨찾기. 비었으면 null
 */
export function NavigationFavorites({
  areaId,
  items,
  dropSlot,
}: NavigationFavoritesProps): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <div {...{ [FAVORITES_AREA_ATTRIBUTE]: areaId }} className="flex flex-col">
      {items.map(
        /**
         * 즐겨찾기 칸 하나와 그 앞 놓을 자리의 가로선을 그린다.
         * @param entry 즐겨찾기 칸
         * @param index 차례
         * @returns 가로선과 칸
         */
        (entry, index) => (
          <Fragment key={entry.key}>
            {dropSlot === index && <DropLine />}
            {entry.item}
          </Fragment>
        ),
      )}
      {dropSlot === items.length && <DropLine />}
      {/* 즐겨찾기와 폴더 트리 사이 구분선. 그 위에 놓으면 즐겨찾기 맨 뒤에 고정한다. */}
      <div
        aria-hidden="true"
        {...{ [FAVORITES_END_ATTRIBUTE]: items.length }}
        className="py-spacing-sm"
      >
        <Separator />
      </div>
    </div>
  );
}

/**
 * 놓을 자리의 가로선. 높이 0인 자리에 겹쳐 그려 칸 배치를 바꾸지 않는다. 피그마 `drop line`이다.
 * @returns 가로선
 */
function DropLine(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-favorites-drop-line=""
      // 포인터 아래 놓을 자리를 찾을 때 가로선이 칸을 가리지 않게 포인터를 받지 않는다.
      className="pointer-events-none relative h-size-none"
    >
      <div className="absolute inset-x-spacing-none top-spacing-none h-stroke-stroke-width-focus-outer bg-color-black-89" />
    </div>
  );
}
