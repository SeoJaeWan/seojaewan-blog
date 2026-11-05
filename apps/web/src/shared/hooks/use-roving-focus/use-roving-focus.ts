import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
} from 'react';

import {
  getNeighborInGrid,
  type SelectionCell,
} from '@/shared/utils/selection-rules/selection-rules';

/** 방향키가 옮기는 방향. `horizontal`은 ←/→, `vertical`은 ↑/↓, `grid`는 네 방향이다 */
export type RovingOrientation = 'horizontal' | 'vertical' | 'grid';

/**
 * 묶음 안 방향키 이동 훅의 설정
 * - orientation: 방향키가 옮기는 방향
 * - itemSelector: 묶음 안의 항목을 찾는 선택자. 기본은 버튼 역할인 요소다
 * - selectedSelector: 고른 항목을 찾는 선택자. 아직 포커스한 적이 없으면 Tab이 이 항목에 닿고, 없으면 첫 항목에 닿는다
 */
type RovingFocusOptions = {
  orientation: RovingOrientation;
  itemSelector?: string;
  selectedSelector?: string;
};

/**
 * 묶음 요소에 다는 속성
 * - onFocus: 포커스를 받은 항목을 기억한다
 * - onBlur: 포커스가 묶음 밖으로 나간 것을 기억한다
 * - onKeyDown: 방향키·Home·End로 항목을 옮긴다
 */
type RovingFocusProps = {
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/** 항목의 화면 위 자리 */
type RovingRect = {
  left: number;
  top: number;
};

const DEFAULT_ITEM_SELECTOR = 'button, [role="button"]';

// 키마다 격자에서 옮기는 방향이다.
const GRID_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
} as const;

/**
 * 항목이 여럿 모인 묶음을 Tab 한 번으로 묶는다. Tab은 묶음에서 항목 하나에만 닿고(마지막에 포커스한 항목, 없으면 고른 항목, 없으면 첫 항목),
 * 안에서는 방향키와 Home·End로 옮긴다. 끝에서는 멈춘다. 항목은 DOM 순서이고, `grid`의 위아래는 화면 위 자리로 찾는다.
 * 포커스한 항목이 사라지면 같은 차례의 항목으로 포커스를 옮긴다(가장 가까운 내용).
 * 항목의 `tabindex`는 그린 뒤 훅이 직접 맞춘다. 항목이 Base UI 버튼, 디자인 시스템 안쪽 버튼, 우클릭 메뉴로 감싼 요소처럼 저마다 다르기 때문이다.
 * @codocs [[접근성:Tab]]
 * @codocs [[접근성:포커스]]
 * @codocs [[접근성:직접 만든 부품]]
 * @param containerRef 묶음 요소
 * @param options 방향과 항목 선택자
 * @returns 묶음 요소에 다는 속성
 */
export function useRovingFocus(
  containerRef: RefObject<HTMLElement | null>,
  options: RovingFocusOptions,
): RovingFocusProps {
  const { orientation, itemSelector = DEFAULT_ITEM_SELECTOR, selectedSelector } = options;
  const currentRef = useRef<HTMLElement | null>(null);
  const currentIndexRef = useRef(0);
  const hasFocusRef = useRef(false);

  useLayoutEffect(
    /** 그릴 때마다 항목의 tabindex를 맞추고, 포커스한 항목이 사라졌으면 같은 차례의 항목으로 옮긴다. */
    () => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const items = getItems(container, itemSelector);
      const current = currentRef.current;
      if (current !== null && !items.includes(current)) {
        const next = items[Math.min(currentIndexRef.current, items.length - 1)] ?? null;
        currentRef.current = next;
        if (hasFocusRef.current && document.activeElement === document.body) {
          next?.focus();
        }
      }
      const selected = selectedSelector === undefined ? null : findItem(items, selectedSelector);
      const tabbable = currentRef.current ?? selected ?? items[0];
      for (const item of items) {
        item.tabIndex = item === tabbable ? 0 : -1;
      }
    },
  );

  /**
   * 포커스를 받은 항목을 기억하고 그 항목을 Tab이 닿는 항목으로 둔다.
   * @param event 포커스 이벤트
   */
  function handleFocus(event: FocusEvent<HTMLElement>): void {
    const container = containerRef.current;
    const item = event.target.closest<HTMLElement>(itemSelector);
    if (container === null || item === null || !container.contains(item)) {
      return;
    }
    hasFocusRef.current = true;
    const items = getItems(container, itemSelector);
    currentRef.current = item;
    currentIndexRef.current = items.indexOf(item);
    for (const candidate of items) {
      candidate.tabIndex = candidate === item ? 0 : -1;
    }
  }

  /**
   * 포커스가 다른 요소로 옮겨 가면 묶음을 벗어난 것으로 본다. 항목이 사라져 잃은 포커스는 옮겨 간 곳이 없다.
   * @param event 포커스 이벤트
   */
  function handleBlur(event: FocusEvent<HTMLElement>): void {
    if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) {
      hasFocusRef.current = false;
    }
  }

  /**
   * 방향키·Home·End로 옆 항목에 포커스를 옮긴다. 수정 키를 함께 누른 키와 항목 밖에서 올라온 키는 받지 않는다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    const container = containerRef.current;
    if (
      container === null ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const item = event.target.closest<HTMLElement>(itemSelector);
    if (item === null || !container.contains(item)) {
      return;
    }
    const items = getItems(container, itemSelector);
    const next = getRovingTargetIndex(
      event.key,
      orientation,
      items.indexOf(item),
      items.map((candidate) => candidate.getBoundingClientRect()),
    );
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  return { onFocus: handleFocus, onBlur: handleBlur, onKeyDown: handleKeyDown };
}

/**
 * 묶음 안의 항목을 DOM 순서로 찾는다. 보조 기술에 숨긴 요소(마우스 전용 버튼, 창 축소 화면 안)와 비활성 버튼은 뺀다.
 * @param container 묶음 요소
 * @param itemSelector 항목 선택자
 * @returns 항목
 */
function getItems(container: HTMLElement, itemSelector: string): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(itemSelector)].filter(
    (item) => item.closest('[aria-hidden="true"]') === null && !item.matches(':disabled'),
  );
}

/**
 * 항목 가운데 선택자에 맞는 첫 항목을 찾는다.
 * @param items 항목
 * @param selector 선택자
 * @returns 항목. 없으면 null
 */
function findItem(items: readonly HTMLElement[], selector: string): HTMLElement | null {
  return items.find((item) => item.matches(selector)) ?? null;
}

/**
 * 눌린 키로 옮겨 갈 항목의 차례를 정한다. 끝에서는 멈추고, `grid`는 화면 위 자리에서 그 방향으로 가장 가까운 항목이다.
 * @codocs [[접근성:Tab]]
 * @param key 누른 키
 * @param orientation 방향키가 옮기는 방향
 * @param index 지금 항목의 차례
 * @param rects 항목의 화면 위 자리(차례대로)
 * @returns 옮겨 갈 차례. 옮기지 않으면 null
 */
export function getRovingTargetIndex(
  key: string,
  orientation: RovingOrientation,
  index: number,
  rects: readonly RovingRect[],
): number | null {
  const lastIndex = rects.length - 1;
  if (index === -1 || lastIndex < 0) {
    return null;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return lastIndex;
  }
  if (orientation === 'grid') {
    const direction = isGridKey(key) ? GRID_DIRECTIONS[key] : null;
    if (direction === null) {
      return null;
    }
    const next = getNeighborInGrid(toGridCells(rects), String(index), direction);
    return next === null ? null : Number(next);
  }
  const [previousKey, nextKey] =
    orientation === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
  if (key === previousKey && index > 0) {
    return index - 1;
  }
  if (key === nextKey && index < lastIndex) {
    return index + 1;
  }
  return null;
}

/**
 * 키가 방향키인지 본다.
 * @param key 키 이름
 * @returns 방향키면 true
 */
function isGridKey(key: string): key is keyof typeof GRID_DIRECTIONS {
  return key in GRID_DIRECTIONS;
}

/**
 * 화면 위 자리를 줄·칸으로 바꾼다.
 * @param rects 항목의 화면 위 자리
 * @returns 차례별 칸
 */
function toGridCells(rects: readonly RovingRect[]): Record<string, SelectionCell> {
  const lefts = [...new Set(rects.map((rect) => rect.left))].sort((a, b) => a - b);
  const tops = [...new Set(rects.map((rect) => rect.top))].sort((a, b) => a - b);
  return Object.fromEntries(
    rects.map((rect, index) => [
      String(index),
      { column: lefts.indexOf(rect.left), row: tops.indexOf(rect.top) },
    ]),
  );
}
