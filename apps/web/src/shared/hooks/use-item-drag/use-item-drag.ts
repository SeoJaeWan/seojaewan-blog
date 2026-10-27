import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';

import type { PointerPoint } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { useItemDragStore } from '@/shared/stores/item-drag-store/item-drag-store';

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

/** 포인터 아래의 놓을 곳 */
export type DropTarget = {
  /** 옮길 위치 id */
  id: string;
  /** 위치 이름 */
  name: string;
};

/** 끄는 중인 상태. 끄는 복제본·툴팁·놓을 곳 강조를 그리는 데 쓴다 */
export type ItemDragState = {
  /** 끄는 항목 id */
  ids: readonly string[];
  /** 누른 자리에서 움직인 거리(px) */
  delta: PointerPoint;
  /** 지금 포인터 자리(화면 기준) */
  pointer: PointerPoint;
  /** 포인터 아래의 놓을 곳. 끄는 항목 자신이나 놓을 곳이 아니면 null */
  target: DropTarget | null;
};

/** 놓았을 때 넘기는 것 */
export type ItemDropResult = ItemDragState & {
  /** 놓은 자리의 요소. 쓰는 곳이 자기 영역 안에 놓았는지 본다 */
  element: Element | null;
  /**
   * 놓은 자리에 놓을 곳이 있었지만 옮길 수 없어(`canDrop`) 놓을 곳으로 보지 않았을 때 그 id. 쓰는 곳이 빈 곳에 놓은 것과
   * 구분해 제자리에 두는 데 쓴다. 놓을 곳이 없었으면 null
   */
  rejectedTargetId: string | null;
};

type UseItemDragOptions = {
  /** 놓으면 부른다. 놓을 곳 위면 `target`이 있고, 아니면 쓰는 곳이 놓은 자리(`element`, `delta`)로 할 일을 정한다 */
  onDrop: (result: ItemDropResult) => void;
  /**
   * 끄는 항목을 그곳으로 옮길 수 있는지. 옮길 수 없는 곳(자기·하위 폴더, 같은 이름 폴더, 끄는 항목이 이미 있는 위치)은
   * 놓을 곳으로 보지 않아 강조·툴팁이 없고, 놓아도 제자리다
   */
  canDrop?: (ids: readonly string[], targetId: string) => boolean;
};

/** 항목 끌기 상태와 시작 핸들러 */
type ItemDragControls = {
  /** 끄는 중인 상태. 끌지 않으면 null */
  drag: ItemDragState | null;
  /** 항목 위에서 누르면 그 항목들(선택한 항목)을 끌기 시작할 준비를 한다. 받지 않는 누르기면 false */
  startItemDrag: (event: ReactPointerEvent, ids: readonly string[]) => boolean;
  /** 방금 끌기를 끝냈는지. 끌고 놓은 뒤 따라오는 클릭을 무시하는 데 쓰고, 한 번 읽으면 지운다 */
  consumeDragEnd: () => boolean;
};

/**
 * 항목(아이콘·목록 줄)을 포인터로 끌어 옮긴다. 바탕화면 아이콘과 탐색기 항목이 쓴다.
 * 끄는 동안 포인터 아래 요소에서 가장 가까운 놓을 곳(`data-drop-target`)을 찾는다. 끄는 항목 자신과 옮길 수 없는 곳은 놓을 곳이 아니다.
 * 놓을 곳은 항목 끌기 저장소에도 알려, 그곳을 그린 쪽(다른 창 포함)이 강조하게 한다.
 * 끄는 복제본처럼 포인터를 따라가는 요소는 `pointer-events: none`이어야 그 아래를 찾는다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @codocs [[파일 탐색기:조작]]
 * @param options 놓을 때 부를 함수
 * @returns 끄는 상태와 시작 핸들러
 */
export function useItemDrag(options: UseItemDragOptions): ItemDragControls {
  const { onDrop, canDrop } = options;
  const startPointerDrag = usePointerDrag();
  const setTargetId = useItemDragStore((state) => state.setTargetId);
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
      const target = findDropTarget(element, ids);
      return {
        ids,
        delta: { x: point.x - origin.x, y: point.y - origin.y },
        pointer: point,
        target: target === null || canDrop?.(ids, target.id) === false ? null : target,
      };
    }

    return startPointerDrag(event, {
      onStart: (start) => {
        origin = start;
        didDragRef.current = true;
      },
      onMove: (point) => {
        const next = measure(point, getElementAt(point));
        setDrag(next);
        setTargetId(next.target?.id ?? null);
      },
      onDrop: (point) => {
        const element = getElementAt(point);
        setDrag(null);
        setTargetId(null);
        const measured = measure(point, element);
        const found = findDropTarget(element, ids);
        onDrop({
          ...measured,
          element,
          rejectedTargetId: measured.target === null && found !== null ? found.id : null,
        });
      },
      onCancel: () => {
        setDrag(null);
        setTargetId(null);
      },
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
 * 놓을 곳 id를 옮길 위치로 바꾼다. 바탕화면(`desktop`)은 null이다.
 * @param targetId 놓을 곳 id
 * @returns 옮길 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 */
export function toDropLocation(targetId: string): string | null {
  return targetId === DESKTOP_DROP_TARGET ? null : targetId;
}
