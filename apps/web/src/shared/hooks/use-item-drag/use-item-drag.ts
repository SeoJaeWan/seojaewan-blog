import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';

import type { PointerPoint } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import {
  type FavoritesDrop,
  useItemDragStore,
} from '@/shared/stores/item-drag-store/item-drag-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { canPlaceFavoritePins } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 끌어 놓을 수 있는 곳(폴더 아이콘·항목, 휴지통, 탐색기 창 본문, 탐색 창 칸, 바탕화면)에 다는 속성.
 * 값은 놓으면 옮길 위치 id(폴더 id, 휴지통 id, 바탕화면은 `desktop`)다. 바탕화면과 탐색기가 같은 속성을 달아,
 * 어느 쪽에서 끌어도 포인터 아래 맨 위 요소에서 가장 가까운 놓을 곳을 찾는다(창이 겹치면 맨 위 창이다).
 */
export const DROP_TARGET_ATTRIBUTE = 'data-drop-target';

/** 바탕화면을 놓을 곳으로 가리키는 id(탐색기 보기의 바탕화면 열쇠 `DESKTOP_LOCATION_KEY`와 같다). 옮길 위치로는 null(바탕화면)이다 */
export const DESKTOP_DROP_TARGET = 'desktop';

/** 놓을 곳의 이름을 다는 속성. `○○(으)로 이동` 툴팁에 쓴다 */
export const DROP_TARGET_NAME_ATTRIBUTE = 'data-drop-target-name';

/**
 * 탐색 창 즐겨찾기 영역에 다는 속성. 값은 영역 id(탐색기 창 id)이며, 놓을 자리의 가로선을 그 창만 그리게 한다.
 */
export const FAVORITES_AREA_ATTRIBUTE = 'data-favorites-area';

/**
 * 즐겨찾기 칸에 다는 속성. 값은 보이는 즐겨찾기에서의 차례다. 칸의 위·아래 끝(높이의 1/4)에 포인터가 있으면 그 칸 앞·뒤가
 * 놓을 자리이고, 가운데면 칸 자체가 놓을 곳(폴더로 이동)이다.
 */
export const FAVORITES_INDEX_ATTRIBUTE = 'data-favorites-index';

/** 즐겨찾기 아래 구분선 자리에 다는 속성. 값은 보이는 즐겨찾기 수이며, 그 위 어디든 맨 뒤가 놓을 자리다 */
export const FAVORITES_END_ATTRIBUTE = 'data-favorites-end';

// 즐겨찾기 칸에서 앞·뒤 놓을 자리로 보는 위·아래 끝의 비율.
const FAVORITES_EDGE_RATIO = 0.25;

/** 포인터 아래의 놓을 곳 */
export type DropTarget = {
  id: string;
  name: string;
};

/**
 * 끄는 중인 상태. 끄는 복제본·툴팁·놓을 곳 강조를 그리는 데 쓴다
 * - delta: 누른 자리에서 움직인 거리(px)
 * - pointer: 지금 포인터 자리(화면 기준)
 * - target: 포인터 아래의 놓을 곳. 끄는 항목 자신이나 놓을 곳이 아니면 null. 즐겨찾기 놓을 자리 위면 null이다
 * - favoritesDrop: 포인터 아래의 즐겨찾기 놓을 자리. 아니면 null
 */
export type ItemDragState = {
  ids: readonly string[];
  delta: PointerPoint;
  pointer: PointerPoint;
  target: DropTarget | null;
  favoritesDrop: FavoritesDrop | null;
};

/**
 * 놓았을 때 넘기는 것
 * - element: 놓은 자리의 요소. 쓰는 곳이 자기 영역 안에 놓았는지 본다
 * - rejectedTargetId: 놓은 자리에 놓을 곳이 있었지만 옮길 수 없어(`canDrop`) 놓을 곳으로 보지 않았을 때 그 id. 쓰는 곳이 빈 곳에 놓은 것과 구분해 제자리에 두는 데 쓴다. 놓을 곳이 없었으면 null.
 *   즐겨찾기 놓을 자리에 놓으면 고정은 이 훅이 맡고, 쓰는 곳에는 놓을 곳 없이 이 값(즐겨찾기 영역 id)으로 알려 제자리에 두게 한다
 */
export type ItemDropResult = ItemDragState & {
  element: Element | null;
  rejectedTargetId: string | null;
};

/**
 * 항목 끌기 훅의 설정
 * - onDrop: 놓으면 부른다. 놓을 곳 위면 `target`이 있고, 아니면 쓰는 곳이 놓은 자리(`element`, `delta`)로 할 일을 정한다
 * - canDrop: 끄는 항목을 그곳으로 옮길 수 있는지. 옮길 수 없는 곳(자기·하위 폴더, 같은 이름 폴더, 끄는 항목이 이미 있는 위치)은 놓을 곳으로 보지 않아 강조·툴팁이 없고, 놓아도 제자리다
 * - isNeutralTarget: 옮길 수 없지만 막힌 곳으로 보지 않을 놓을 곳인지. 바탕화면 아이콘을 바탕화면 빈 곳에 끌면 옮기기가 아니라 칸 옮기기라 `canDrop`이 거부해도 `not-allowed` 커서를 보이지 않는다
 */
type UseItemDragOptions = {
  onDrop: (result: ItemDropResult) => void;
  canDrop?: (ids: readonly string[], targetId: string) => boolean;
  isNeutralTarget?: (targetId: string) => boolean;
};

/**
 * 옮길 수 없는 곳 위를 끄는 동안 문서 맨 위 요소(`html`)에 다는 속성. 전역 CSS가 이 속성이 있으면 어디서나 `not-allowed` 커서를 보인다.
 */
export const DRAG_REJECTED_ATTRIBUTE = 'data-item-drag-rejected';

/**
 * 항목 끌기 상태와 시작 핸들러
 * - drag: 끄는 중인 상태. 끌지 않으면 null
 * - startItemDrag: 항목 위에서 누르면 그 항목들(선택한 항목)을 끌기 시작할 준비를 한다. 받지 않는 누르기면 false
 * - consumeDragEnd: 방금 끌기를 끝냈는지. 끌고 놓은 뒤 따라오는 클릭을 무시하는 데 쓰고, 한 번 읽으면 지운다
 */
type ItemDragControls = {
  drag: ItemDragState | null;
  startItemDrag: (event: ReactPointerEvent, ids: readonly string[]) => boolean;
  consumeDragEnd: () => boolean;
};

/**
 * 항목(아이콘·목록 줄)을 포인터로 끌어 옮긴다. 바탕화면 아이콘과 탐색기 항목이 쓴다.
 * 끄는 동안 포인터 아래 요소에서 가장 가까운 놓을 곳(`data-drop-target`)을 찾는다. 끄는 항목 자신과 옮길 수 없는 곳은 놓을 곳이 아니다.
 * 놓을 곳은 항목 끌기 저장소에도 알려, 그곳을 그린 쪽(다른 창 포함)이 강조하게 한다.
 * 탐색 창 즐겨찾기 칸 사이(놓을 자리)는 이 훅이 맡는다. 끄는 항목이 모두 폴더면 그 자리에 고정하거나 순서를 바꾸고, 아니면 `not-allowed` 커서다.
 * 옮길 수 없는 놓을 곳 위에서는 강조와 툴팁 없이 커서를 `not-allowed`로 바꾸고(`DRAG_REJECTED_ATTRIBUTE`), 끌기가 끝나면 되돌린다.
 * 끄는 복제본처럼 포인터를 따라가는 요소는 `pointer-events: none`이어야 그 아래를 찾는다.
 * @codocs [[항목 조작:끌기]]
 * @codocs [[파일 탐색기:조작]]
 * @codocs [[파일 탐색기:탐색 창]]
 * @param options 놓을 때 부를 함수
 * @returns 끄는 상태와 시작 핸들러
 */
export function useItemDrag(options: UseItemDragOptions): ItemDragControls {
  const { onDrop, canDrop, isNeutralTarget } = options;
  const startPointerDrag = usePointerDrag();
  const setTargetId = useItemDragStore((state) => state.setTargetId);
  const setFavoritesDrop = useItemDragStore((state) => state.setFavoritesDrop);
  const [drag, setDrag] = useState<ItemDragState | null>(null);
  const didDragRef = useRef(false);

  /**
   * 항목들을 끌기 시작할 준비를 한다.
   * @param event 누르기 이벤트
   * @param ids 끌 항목 id
   * @returns 받은 누르기면 true
   */
  function startItemDrag(event: ReactPointerEvent, ids: readonly string[]): boolean {
    didDragRef.current = false;
    let origin: PointerPoint = { x: event.clientX, y: event.clientY };

    /**
     * 포인터 자리로 끄는 상태를 만든다.
     * @param point 포인터 자리
     * @param element 포인터 아래 요소
     * @returns 끄는 상태
     */
    function measure(point: PointerPoint, element: Element | null): ItemDragState {
      const delta = { x: point.x - origin.x, y: point.y - origin.y };
      const favoritesDrop = findFavoritesDrop(element, point, ids);
      if (favoritesDrop !== null) {
        return { ids, delta, pointer: point, target: null, favoritesDrop };
      }
      const target = findDropTarget(element, ids);
      return {
        ids,
        delta,
        pointer: point,
        target: target === null || canDrop?.(ids, target.id) === false ? null : target,
        favoritesDrop: null,
      };
    }

    /** 끄는 동안 저장소와 커서에 알린 것을 지운다. */
    function clear(): void {
      setDrag(null);
      setTargetId(null);
      setFavoritesDrop(null);
      setRejectedCursor(false);
    }

    return startPointerDrag(event, {
      onStart: (start) => {
        origin = start;
        didDragRef.current = true;
      },
      onMove: (point) => {
        const element = getElementAt(point);
        const next = measure(point, element);
        const found = findDropTarget(element, ids);
        setDrag(next);
        setTargetId(next.target?.id ?? null);
        setFavoritesDrop(next.favoritesDrop);
        setRejectedCursor(
          next.favoritesDrop === null
            ? next.target === null && found !== null && isNeutralTarget?.(found.id) !== true
            : !next.favoritesDrop.isAllowed,
        );
      },
      onDrop: (point) => {
        const element = getElementAt(point);
        clear();
        const measured = measure(point, element);
        const { favoritesDrop } = measured;
        if (favoritesDrop !== null) {
          if (favoritesDrop.isAllowed) {
            useWorkspaceStore.getState().placeFavoritePins(ids, favoritesDrop.slot);
          }
          onDrop({ ...measured, element, rejectedTargetId: favoritesDrop.areaId });
          return;
        }
        const found = findDropTarget(element, ids);
        onDrop({
          ...measured,
          element,
          rejectedTargetId: measured.target === null && found !== null ? found.id : null,
        });
      },
      onCancel: clear,
    });
  }

  /**
   * 방금 끌기를 끝냈는지 읽고 지운다.
   * @returns 끌었으면 true
   */
  function consumeDragEnd(): boolean {
    const hasDragged = didDragRef.current;
    didDragRef.current = false;
    return hasDragged;
  }

  return { drag, startItemDrag, consumeDragEnd };
}

/**
 * 옮길 수 없는 곳 위를 끄는 중인지 문서에 표시한다. 전역 CSS가 표시를 보고 어디서나 `not-allowed` 커서를 보인다.
 * 끄는 요소가 포인터를 붙잡고 있어 그 아래 요소의 커서가 아니라 문서 전체에 건다.
 * @codocs [[항목 조작:끌기]]
 * @param isRejected 옮길 수 없는 곳 위면 true
 */
function setRejectedCursor(isRejected: boolean): void {
  document.documentElement.toggleAttribute(DRAG_REJECTED_ATTRIBUTE, isRejected);
}

/**
 * 화면 자리의 맨 위 요소를 찾는다. `elementFromPoint`가 없는 환경(jsdom)에서는 null이다.
 * @param point 화면 자리
 * @returns 요소
 */
function getElementAt(point: PointerPoint): Element | null {
  if (typeof document.elementFromPoint !== 'function') {
    return null;
  }
  return document.elementFromPoint(point.x, point.y);
}

/**
 * 요소에서 가장 가까운 놓을 곳을 찾는다. 끄는 항목 자신이면 놓을 곳이 아니다.
 * @param element 포인터 아래 요소
 * @param ids 끄는 항목 id
 * @returns 놓을 곳. 없으면 null
 */
function findDropTarget(element: Element | null, ids: readonly string[]): DropTarget | null {
  const targetElement = element?.closest(`[${DROP_TARGET_ATTRIBUTE}]`) ?? null;
  const id = targetElement?.getAttribute(DROP_TARGET_ATTRIBUTE) ?? null;
  if (targetElement === null || id === null || ids.includes(id)) {
    return null;
  }
  return { id, name: targetElement.getAttribute(DROP_TARGET_NAME_ATTRIBUTE) ?? '' };
}

/**
 * 포인터 아래의 즐겨찾기 놓을 자리를 찾는다. 즐겨찾기 칸의 위·아래 끝이면 그 칸 앞·뒤, 구분선 자리면 맨 뒤다.
 * 칸 가운데(폴더로 이동)나 즐겨찾기 밖이면 null이다.
 * @codocs [[파일 탐색기:탐색 창]]
 * @param element 포인터 아래 요소
 * @param point 포인터 자리
 * @param ids 끄는 항목 id
 * @returns 놓을 자리. 없으면 null
 */
function findFavoritesDrop(
  element: Element | null,
  point: PointerPoint,
  ids: readonly string[],
): FavoritesDrop | null {
  const areaId =
    element?.closest(`[${FAVORITES_AREA_ATTRIBUTE}]`)?.getAttribute(FAVORITES_AREA_ATTRIBUTE) ??
    null;
  const slot = areaId === null ? null : getFavoritesSlot(element, point);
  if (areaId === null || slot === null) {
    return null;
  }
  return { areaId, slot, isAllowed: canPlaceFavoritePins(useWorkspaceStore.getState(), ids) };
}

/**
 * 즐겨찾기 영역 안 요소에서 놓을 자리의 차례를 읽는다.
 * @param element 포인터 아래 요소
 * @param point 포인터 자리
 * @returns 놓을 자리. 칸 가운데나 자리 밖이면 null
 */
function getFavoritesSlot(element: Element | null, point: PointerPoint): number | null {
  const end =
    element?.closest(`[${FAVORITES_END_ATTRIBUTE}]`)?.getAttribute(FAVORITES_END_ATTRIBUTE) ?? null;
  if (end !== null) {
    return Number(end);
  }
  const row = element?.closest(`[${FAVORITES_INDEX_ATTRIBUTE}]`) ?? null;
  const index = row?.getAttribute(FAVORITES_INDEX_ATTRIBUTE) ?? null;
  if (row === null || index === null) {
    return null;
  }
  const rect = row.getBoundingClientRect();
  const edge = rect.height * FAVORITES_EDGE_RATIO;
  if (point.y < rect.top + edge) {
    return Number(index);
  }
  if (point.y > rect.bottom - edge) {
    return Number(index) + 1;
  }
  return null;
}

/**
 * 놓을 곳 id를 옮길 위치로 바꾼다. 바탕화면(`desktop`)은 null이다.
 * @param targetId 놓을 곳 id
 * @returns 옮길 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 */
export function toDropLocation(targetId: string): string | null {
  return targetId === DESKTOP_DROP_TARGET ? null : targetId;
}
