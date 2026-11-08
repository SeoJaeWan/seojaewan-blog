import { type RefObject, useLayoutEffect, useRef } from 'react';

import type { PointerPoint } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import type { LayoutPoint } from '@/shared/utils/layout-rect/layout-rect';
import {
  getLayoutRect,
  getRectCenter,
  parseTranslate,
} from '@/shared/utils/layout-rect/layout-rect';

// 순서 바꾸기 모션 클래스와 그 실행 중 값(motion.css)이다. 키프레임 이름이 클래스 이름과 같다.
const LIFT_CLASS_NAME = 'motion-reorder-lift';
const DROP_CLASS_NAME = 'motion-reorder-drop';
const SLIDE_CLASS_NAME = 'motion-reorder-slide';
const FROM_X = '--motion-reorder-from-x';
const FROM_Y = '--motion-reorder-from-y';
// 끄는 항목을 옆 항목 위에 그린다. 미끄러지는 옆 항목도 translate로 겹 순서가 올라가기 때문이다.
const DRAGGING_CLASS_NAME = 'z-layer-drag-ghost';
// 움직임 상태를 드러내는 속성. 동작 스토리가 확인한다.
const MOTION_ATTRIBUTE = 'data-reorder-motion';
// 메뉴 이동에서 옮기는 항목이 미끄러짐을 기다리는 동안 숨기는 클래스다.
const HIDDEN_CLASS_NAME = 'invisible';
// 이보다 적게 움직인 자리 변화는 움직이지 않은 것으로 본다(px). 소수점 반올림 차이를 거른다.
const MIN_DISTANCE = 0.5;

/** 놓은 뒤·밀려날 때 재생하는 움직임. from은 이전에 보이던 자리에서 새 자리까지의 거리(이전 - 새 자리)다 */
type SettleMotion = {
  className: typeof DROP_CLASS_NAME | typeof SLIDE_CLASS_NAME;
  from: LayoutPoint;
};

/** 끄는 중인 항목. start는 누른 자리, origin은 끌기를 시작할 때 항목의 원래 자리 가운데, pointer는 지금 포인터 자리다 */
type DragState = {
  key: string;
  start: PointerPoint;
  origin: LayoutPoint;
  pointer: PointerPoint;
};

/**
 * 순서 바꾸기 움직임 설정
 * - itemAttribute: 항목 요소에 달린, 항목 id를 담은 속성 이름. 이 속성이 달린 요소가 움직인다
 * - axis: 끄는 항목이 포인터를 따라오는 방향. 작업 표시줄과 탭은 가로(`x`)만, Start 고정됨 격자는 양쪽(`both`)이다
 * - moveClassNames: 메뉴로 옮길 때(`playMove`) 옮기는 항목이 사라지고 나타나는 모션 클래스. Start 고정됨만 준다
 */
export type ReorderMotionOptions = {
  itemAttribute: string;
  axis: 'x' | 'both';
  moveClassNames?: { exit: string; enter: string };
};

/**
 * 순서 바꾸기 움직임을 다루는 함수
 * - startDrag: 끌기를 시작한다. 누른 요소(또는 그 안쪽 요소), 누른 자리, 지금 포인터 자리를 받는다
 * - moveDrag: 끄는 항목을 포인터 자리로 옮긴다. 순서를 바꾸기 전에 부른다
 * - endDrag: 놓거나 취소할 때 부른다. 끄는 항목이 새 자리로 미끄러져 들어간다
 * - playMove: 메뉴로 항목을 옮긴다. 옮기는 항목의 id와 순서를 바꾸는 함수를 받는다
 */
export type ReorderMotion = {
  startDrag: (element: Element, start: PointerPoint, point: PointerPoint) => void;
  moveDrag: (point: PointerPoint) => void;
  endDrag: () => void;
  playMove: (key: string, move: () => void) => void;
};

/**
 * 목록의 순서가 바뀔 때 항목을 FLIP으로 움직인다. 작업 표시줄 고정 앱, 탐색기·Chrome 탭, Start 고정됨이 함께 쓴다.
 * - 끌기: 끄는 항목에 `motion-reorder-lift`(1.1배)를 붙이고, 포인터를 따라오도록 `translate`를 준다. 순서가 바뀌어
 *   항목의 자리가 바뀌어도 포인터 아래에 남도록 바뀐 자리만큼 되돌려 준다.
 * - 밀려남: 그릴 때마다 항목 순서를 보고, 순서가 바뀌었으면(같은 항목들) 자리가 바뀐 항목마다 이전에 보이던 자리에서
 *   새 자리까지의 거리를 `--motion-reorder-from-x·-y`로 넘기고 `motion-reorder-slide`를 처음부터 재생한다. 끌기 밖에서
 *   순서가 바뀌어도(메뉴 이동) 같다. 항목이 더해지거나 빠진 그리기는 움직이지 않는다.
 * - 놓기: 끄는 항목의 `translate`와 lift를 떼고, 놓은 자리에서 새 자리까지의 거리로 `motion-reorder-drop`을 재생한다.
 * - 애니메이션이 끝나면 클래스와 값을 뗀다. 클래스는 항목의 className prop에 두지 않고 classList로 다루며, React가 className을
 *   다시 쓰면 그린 뒤에 다시 붙인다(같은 프레임 안이라 애니메이션은 이어진다). 상태는 `data-reorder-motion`(lift·drop·slide)으로 드러낸다.
 * - 메뉴 이동(`playMove`): 옮기는 항목이 exit 클래스로 제자리에서 사라진 뒤 순서를 바꾸고(숨긴 채), 나머지가 미끄러지기를
 *   기다렸다가 새 자리에서 enter 클래스로 나타난다. 상태는 `data-reorder-motion`(exit·enter)으로 드러낸다.
 *   기다릴 애니메이션이 없으면(동작 줄이기, jsdom) 바로 다음 단계로 간다.
 * - 이전 자리는 그릴 때마다 항목의 원래 자리를 목록 바탕 기준으로 기억해 둔다. 목록을 담은 패널이 움직여도(Start 열기) 어긋나지 않게 하기 위해서다.
 * @codocs [[항목 조작:순서 바꾸기 끌기]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param containerRef 항목들을 담은 요소. `display: contents`이면 그 부모를 바탕으로 잰다
 * @param options 항목 속성과 따라오는 방향
 * @returns 끌기를 다루는 함수
 */
export function useReorderMotion(
  containerRef: RefObject<HTMLElement | null>,
  options: ReorderMotionOptions,
): ReorderMotion {
  const { itemAttribute, axis, moveClassNames } = options;
  // 항목마다 마지막으로 잰 원래 자리(목록 바탕 기준 가운데)와 그때의 순서다.
  const layoutsRef = useRef(new Map<string, LayoutPoint>());
  const orderRef = useRef<readonly string[]>([]);
  const motionsRef = useRef(new Map<string, SettleMotion>());
  const dragRef = useRef<DragState | null>(null);
  // 메뉴 이동 중인 항목마다 붙들어 둔 클래스(exit·숨김·enter)와, 순서가 바뀌면 나타날 항목이다.
  const heldRef = useRef(new Map<string, string>());
  const arrivingRef = useRef<string | null>(null);

  useLayoutEffect(
    /** 그릴 때마다 순서가 바뀌었으면 밀려난 항목을 미끄러뜨리고, 움직임 클래스를 다시 붙이고, 자리를 기억한다. */
    () => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const items = getItems(container, itemAttribute);
      const order = [...items.keys()];
      const drag = dragRef.current;
      if (isReordered(orderRef.current, order)) {
        const base = getBaseOrigin(container);
        const arriving = arrivingRef.current;
        arrivingRef.current = null;
        const slid: HTMLElement[] = [];
        for (const [key, element] of items) {
          const previous = layoutsRef.current.get(key);
          if (key === drag?.key || key === arriving || previous === undefined) {
            continue;
          }
          const layout = subtract(getRectCenter(getLayoutRect(element)), base);
          if (getDistance(previous, layout) < MIN_DISTANCE) {
            continue;
          }
          // 미끄러지는 중이었으면 지금 보이는 자리에서 이어서 미끄러진다.
          const shown = parseTranslate(getComputedStyleOf(element)?.translate ?? '');
          const from = subtract(add(previous, shown), layout);
          playSettle(element, { className: SLIDE_CLASS_NAME, from });
          motionsRef.current.set(key, { className: SLIDE_CLASS_NAME, from });
          slid.push(element);
        }
        if (arriving !== null) {
          // 나머지 칸이 다 미끄러진 뒤 옮긴 칸이 새 자리에서 나타난다.
          afterAnimations(slid, SLIDE_CLASS_NAME, () => {
            enter(arriving);
          });
        }
      }
      // 메뉴 이동 중인 항목의 클래스도 다시 붙인다.
      for (const [key, className] of heldRef.current) {
        items.get(key)?.classList.add(className);
      }
      // React가 className을 다시 썼으면 움직임 클래스를 다시 붙인다.
      for (const [key, motion] of motionsRef.current) {
        const element = items.get(key);
        if (element !== undefined && !element.classList.contains(motion.className)) {
          element.classList.add(motion.className);
        }
      }
      const dragged = drag === null ? undefined : items.get(drag.key);
      if (drag !== null && dragged !== undefined) {
        // 목록 안에서 옮겨진 요소는 애니메이션이 처음부터 다시 돈다. 커진 모습을 바로 갖게 lift를 끝낸다.
        dragged.classList.add(LIFT_CLASS_NAME, DRAGGING_CLASS_NAME);
        finishAnimation(dragged, LIFT_CLASS_NAME);
        followPointer(dragged, drag);
      }
      orderRef.current = order;
      rememberLayouts(container, items);
    },
  );

  useLayoutEffect(
    /**
     * 애니메이션이 끝난 항목의 움직임 클래스와 값을 뗀다.
     * @returns 이벤트를 떼는 정리 함수
     */
    () => {
      const container = containerRef.current;
      if (container === null) {
        return undefined;
      }
      /**
       * 놓기·미끄러짐 애니메이션이 끝나면 그 항목을 정지 모습으로 돌린다.
       * @param event 애니메이션 끝 이벤트
       */
      function handleAnimationEnd(event: AnimationEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const key = target.getAttribute(itemAttribute);
        const motion = key === null ? undefined : motionsRef.current.get(key);
        if (key === null || motion?.className !== event.animationName) {
          return;
        }
        motionsRef.current.delete(key);
        clearSettle(target);
      }
      container.addEventListener('animationend', handleAnimationEnd);
      return () => {
        container.removeEventListener('animationend', handleAnimationEnd);
      };
    },
    [containerRef, itemAttribute],
  );

  /**
   * 끄는 항목을 포인터 자리로 옮긴다. 원래 자리가 끌기 시작 때와 달라졌으면(순서가 바뀜) 그만큼 되돌린다.
   * @param element 끄는 항목
   * @param drag 끄는 상태
   */
  function followPointer(element: HTMLElement, drag: DragState): void {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const layout = subtract(getRectCenter(getLayoutRect(element)), getBaseOrigin(container));
    const x = drag.pointer.x - drag.start.x - (layout.x - drag.origin.x);
    const y = axis === 'both' ? drag.pointer.y - drag.start.y - (layout.y - drag.origin.y) : 0;
    element.style.translate = `${String(x)}px ${String(y)}px`;
  }

  /**
   * 끌기를 시작한다. 끄는 항목을 키우고 포인터를 따라오게 한다.
   * @param element 누른 요소(또는 그 안쪽 요소)
   * @param start 누른 자리
   * @param point 지금 포인터 자리
   */
  function startDrag(element: Element, start: PointerPoint, point: PointerPoint): void {
    const container = containerRef.current;
    const item = element.closest(`[${itemAttribute}]`);
    const key = item?.getAttribute(itemAttribute) ?? null;
    if (container === null || !(item instanceof HTMLElement) || key === null) {
      return;
    }
    // 끌기 전에 창·화면 크기가 바뀌었을 수 있어 자리를 다시 잰다.
    rememberLayouts(container, getItems(container, itemAttribute));
    const origin = layoutsRef.current.get(key);
    if (origin === undefined) {
      return;
    }
    motionsRef.current.delete(key);
    clearSettle(item);
    item.classList.add(LIFT_CLASS_NAME, DRAGGING_CLASS_NAME);
    item.setAttribute(MOTION_ATTRIBUTE, 'lift');
    const drag = { key, start, origin, pointer: point };
    dragRef.current = drag;
    followPointer(item, drag);
  }

  /**
   * 끄는 항목을 포인터 자리로 옮긴다.
   * @param point 지금 포인터 자리
   */
  function moveDrag(point: PointerPoint): void {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (drag === null || container === null) {
      return;
    }
    drag.pointer = point;
    const item = getItems(container, itemAttribute).get(drag.key);
    if (item !== undefined) {
      followPointer(item, drag);
    }
  }

  /** 놓거나 취소하면 끄는 항목이 놓은 자리에서 새 자리로 미끄러져 들어가며 원래 크기로 돌아온다. */
  function endDrag(): void {
    const drag = dragRef.current;
    dragRef.current = null;
    const container = containerRef.current;
    if (drag === null || container === null) {
      return;
    }
    const item = getItems(container, itemAttribute).get(drag.key);
    if (item === undefined) {
      return;
    }
    const from = parseTranslate(item.style.translate);
    item.style.removeProperty('translate');
    item.classList.remove(LIFT_CLASS_NAME, DRAGGING_CLASS_NAME);
    const motion = { className: DROP_CLASS_NAME, from } as const;
    playSettle(item, motion);
    motionsRef.current.set(drag.key, motion);
  }

  /**
   * 항목마다 원래 자리를 목록 바탕 기준으로 기억한다.
   * @param container 항목들을 담은 요소
   * @param items 항목 요소
   */
  function rememberLayouts(container: HTMLElement, items: ReadonlyMap<string, HTMLElement>): void {
    const base = getBaseOrigin(container);
    const layouts = new Map<string, LayoutPoint>();
    for (const [key, element] of items) {
      layouts.set(key, subtract(getRectCenter(getLayoutRect(element)), base));
    }
    layoutsRef.current = layouts;
  }

  /**
   * 메뉴 이동 중인 항목의 클래스를 바꾼다. 앞서 붙든 클래스는 뗀다.
   * @param key 항목 id
   * @param className 붙들 클래스. null이면 모두 뗀다
   * @param state 드러낼 상태(`data-reorder-motion`). null이면 뗀다
   * @returns 항목 요소. 없으면 undefined
   */
  function hold(
    key: string,
    className: string | null,
    state: string | null,
  ): HTMLElement | undefined {
    const container = containerRef.current;
    const item = container === null ? undefined : getItems(container, itemAttribute).get(key);
    const previous = heldRef.current.get(key);
    if (previous !== undefined) {
      item?.classList.remove(previous);
    }
    if (className === null) {
      heldRef.current.delete(key);
    } else {
      heldRef.current.set(key, className);
      item?.classList.add(className);
    }
    if (state === null) {
      item?.removeAttribute(MOTION_ATTRIBUTE);
    } else {
      item?.setAttribute(MOTION_ATTRIBUTE, state);
    }
    return item;
  }

  /**
   * 옮긴 항목을 새 자리에서 나타나게 하고, 다 나타나면 클래스를 뗀다.
   * @param key 항목 id
   */
  function enter(key: string): void {
    if (moveClassNames === undefined || heldRef.current.get(key) !== HIDDEN_CLASS_NAME) {
      return;
    }
    const enterClassName = moveClassNames.enter;
    const item = hold(key, enterClassName, 'enter');
    afterAnimations(
      item === undefined ? [] : [item],
      enterClassName,
      /** 다 나타나면 붙든 클래스를 뗀다. */
      () => {
        if (heldRef.current.get(key) === enterClassName) {
          hold(key, null, null);
        }
      },
    );
  }

  /**
   * 메뉴로 항목을 옮긴다. 옮기는 항목이 제자리에서 사라진 뒤 순서를 바꾸고, 나머지가 미끄러진 뒤 새 자리에서 나타난다.
   * 사라지는 동안 목록이 사라져도(Start 닫힘) 순서는 바꾼다.
   * @param key 옮기는 항목 id
   * @param move 순서를 바꾸는 함수
   */
  function playMove(key: string, move: () => void): void {
    if (moveClassNames === undefined) {
      move();
      return;
    }
    const item = hold(key, moveClassNames.exit, 'exit');
    afterAnimations(
      item === undefined ? [] : [item],
      moveClassNames.exit,
      /** 다 사라지면 숨긴 채 순서를 바꾼다. */
      () => {
        hold(key, HIDDEN_CLASS_NAME, 'exit');
        arrivingRef.current = key;
        move();
        // 순서가 바뀌지 않았으면(그릴 것이 없음) 기다리지 않고 바로 나타난다.
        setTimeout(
          /** 순서가 바뀌지 않아 기다릴 미끄러짐이 없으면 바로 나타난다. */
          () => {
            if (arrivingRef.current === key) {
              arrivingRef.current = null;
              enter(key);
            }
          },
          0,
        );
      },
    );
  }

  return { startDrag, moveDrag, endDrag, playMove };
}

/**
 * 순서가 바뀌었는지 본다. 같은 항목들이 다른 순서로 있을 때만 참이다. 항목이 더해지거나 빠졌으면 움직이지 않는다.
 * @codocs [[항목 조작:순서 바꾸기 끌기]]
 * @param previous 이전 순서
 * @param next 지금 순서
 * @returns 순서가 바뀌었으면 true
 */
export function isReordered(previous: readonly string[], next: readonly string[]): boolean {
  if (previous.length !== next.length || previous.every((key, index) => key === next[index])) {
    return false;
  }
  const keys = new Set(previous);
  return next.every((key) => keys.has(key));
}

/**
 * 항목 요소를 순서대로 찾는다.
 * @param container 항목들을 담은 요소
 * @param itemAttribute 항목 id를 담은 속성 이름
 * @returns 항목 id와 요소
 */
function getItems(container: HTMLElement, itemAttribute: string): Map<string, HTMLElement> {
  const items = new Map<string, HTMLElement>();
  for (const element of container.querySelectorAll<HTMLElement>(`[${itemAttribute}]`)) {
    const key = element.getAttribute(itemAttribute);
    if (key !== null && !items.has(key)) {
      items.set(key, element);
    }
  }
  return items;
}

/**
 * 자리를 잴 바탕의 왼쪽 위를 잰다. `display: contents`처럼 상자가 없으면 부모를 바탕으로 쓴다.
 * @param container 항목들을 담은 요소
 * @returns 바탕 왼쪽 위(화면 기준)
 */
function getBaseOrigin(container: HTMLElement): LayoutPoint {
  const base =
    container.getClientRects().length === 0 && container.parentElement !== null
      ? container.parentElement
      : container;
  const rect = base.getBoundingClientRect();
  return { x: rect.x, y: rect.y };
}

/**
 * 놓기·미끄러짐을 처음부터 재생한다. 클래스를 뗀 뒤 스타일을 다시 계산시켜야 다시 붙인 것이 새 재생이 된다.
 * @param element 움직일 항목
 * @param motion 재생할 움직임
 */
function playSettle(element: HTMLElement, motion: SettleMotion): void {
  element.style.setProperty(FROM_X, `${String(motion.from.x)}px`);
  element.style.setProperty(FROM_Y, `${String(motion.from.y)}px`);
  element.classList.remove(DROP_CLASS_NAME, SLIDE_CLASS_NAME);
  element.getBoundingClientRect();
  element.classList.add(motion.className);
  element.setAttribute(MOTION_ATTRIBUTE, motion.className === DROP_CLASS_NAME ? 'drop' : 'slide');
}

/**
 * 놓기·미끄러짐 클래스와 값을 떼어 정지 모습으로 돌린다.
 * @param element 항목
 */
function clearSettle(element: HTMLElement): void {
  element.classList.remove(DROP_CLASS_NAME, SLIDE_CLASS_NAME);
  element.style.removeProperty(FROM_X);
  element.style.removeProperty(FROM_Y);
  element.removeAttribute(MOTION_ATTRIBUTE);
}

/**
 * 요소들에 걸린, 이름이 주어진 이름으로 시작하는 CSS 애니메이션이 모두 끝나면 부른다. 기다릴 애니메이션이 없으면
 * (동작 줄이기, jsdom) 바로 부른다. 취소된 애니메이션(`finished` 거부)도 끝난 것으로 본다.
 * @param elements 요소
 * @param animationName 애니메이션(키프레임) 이름의 앞부분
 * @param done 끝나면 부를 함수
 */
function afterAnimations(
  elements: readonly HTMLElement[],
  animationName: string,
  done: () => void,
): void {
  const animations = elements.flatMap(
    /**
     * 요소에 걸린, 이름이 맞는 CSS 애니메이션을 찾는다.
     * @param element 요소
     * @returns 애니메이션
     */
    (element) =>
      typeof element.getAnimations === 'function'
        ? element
            .getAnimations()
            .filter(
              (animation) =>
                animation instanceof CSSAnimation &&
                animation.animationName.startsWith(animationName),
            )
        : [],
  );
  if (animations.length === 0) {
    done();
    return;
  }
  Promise.allSettled(animations.map((animation) => animation.finished)).then(done, done);
}

/**
 * 요소에 걸린 이름의 CSS 애니메이션을 끝 모습으로 보낸다. `getAnimations`가 없으면(jsdom) 아무것도 하지 않는다.
 * @param element 요소
 * @param animationName 애니메이션(키프레임) 이름
 */
function finishAnimation(element: HTMLElement, animationName: string): void {
  if (typeof element.getAnimations !== 'function') {
    return;
  }
  for (const animation of element.getAnimations()) {
    if (animation instanceof CSSAnimation && animation.animationName === animationName) {
      animation.finish();
    }
  }
}

/**
 * 요소의 계산된 스타일을 돌려준다.
 * @param element 요소
 * @returns 계산된 스타일. 창이 없으면 undefined
 */
function getComputedStyleOf(element: Element): CSSStyleDeclaration | undefined {
  return element.ownerDocument.defaultView?.getComputedStyle(element);
}

/**
 * 두 자리를 더한다.
 * @param a 자리
 * @param b 자리
 * @returns 합
 */
function add(a: LayoutPoint, b: LayoutPoint): LayoutPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * 앞 자리에서 뒤 자리를 뺀다.
 * @param a 자리
 * @param b 뺄 자리
 * @returns 차
 */
function subtract(a: LayoutPoint, b: LayoutPoint): LayoutPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * 두 자리 사이 거리를 잰다.
 * @param a 자리
 * @param b 자리
 * @returns 거리(px)
 */
function getDistance(a: LayoutPoint, b: LayoutPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
