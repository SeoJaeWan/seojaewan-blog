import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';

import type { PointerPoint } from '@/features/desktop/hooks/use-pointer-drag/use-pointer-drag';
import { usePointerDrag } from '@/features/desktop/hooks/use-pointer-drag/use-pointer-drag';

/**
 * 끌어 놓을 수 있는 곳(폴더 아이콘, 휴지통)에 다는 속성. 값은 놓으면 옮길 위치 id(폴더 id, 휴지통 id)다.
 * 탐색기 창도 같은 속성을 달면 어느 쪽에서 끌어도 같은 방법으로 놓을 곳을 찾는다(탐색기 단계에서 shared로 옮긴다).
 */
export const DROP_TARGET_ATTRIBUTE = 'data-drop-target';

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
};

type UseItemDragOptions = {
  /** 놓으면 부른다. 놓을 곳 위면 `target`이 있고, 아니면 쓰는 곳이 놓은 자리(`element`, `delta`)로 할 일을 정한다 */
  onDrop: (result: ItemDropResult) => void;
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
 * 항목(아이콘·목록 줄)을 포인터로 끌어 옮긴다. 바탕화면 아이콘에 쓰고, 탐색기의 창 사이 끌기가 쓰게 되면 shared로 옮긴다.
 * 끄는 동안 포인터 아래 요소에서 가장 가까운 놓을 곳(`data-drop-target`)을 찾는다. 끄는 항목 자신은 놓을 곳이 아니다.
 * 끄는 복제본처럼 포인터를 따라가는 요소는 `pointer-events: none`이어야 그 아래를 찾는다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param options 놓을 때 부를 함수
 * @returns 끄는 상태와 시작 핸들러
 */
export function useItemDrag(options: UseItemDragOptions): ItemDragControls {
  const { onDrop } = options;
  const startPointerDrag = usePointerDrag();
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
      return {
        ids,
        delta: { x: point.x - origin.x, y: point.y - origin.y },
        pointer: point,
        target: findDropTarget(element, ids),
      };
    }

    return startPointerDrag(event, {
      onStart: (start) => {
        origin = start;
        didDragRef.current = true;
      },
      onMove: (point) => {
        setDrag(measure(point, getElementAt(point)));
      },
      onDrop: (point) => {
        const element = getElementAt(point);
        setDrag(null);
        onDrop({ ...measure(point, element), element });
      },
      onCancel: () => {
        setDrag(null);
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
