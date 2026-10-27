import { type KeyboardEvent, type PointerEvent, type RefObject, useEffect, useRef } from 'react';

import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';

type UseTabStripOptions = {
  /** 고른 탭의 차례 */
  selectedIndex: number;
  /** 탭 개수 */
  tabCount: number;
  /** 탭을 끌어 다른 자리로 옮길 때. 옮길 탭의 차례와 옮길 자리를 받는다 */
  onTabMove?: (from: number, to: number) => void;
  /** 키보드(←/→/Home/End)로 다른 탭으로 옮겨 갔을 때. 고를 탭의 차례를 받는다 */
  onTabSelect?: (index: number) => void;
};

/** 탭 줄 요소와 탭 끌기 핸들러 */
type TabStripControls = {
  /** 탭 줄(`role="tablist"`) 요소에 다는 ref. 탭 요소는 이 요소의 바로 아래 자식이다 */
  tabListRef: RefObject<HTMLDivElement | null>;
  /** 탭 위에서 누르면 그 탭을 끌어 순서를 바꾸기 시작한다 */
  startTabDrag: (event: PointerEvent, index: number) => void;
  /** 탭(`role="tab"`)의 tabIndex. 고른 탭만 Tab 키로 닿는다(roving tabindex) */
  getTabIndex: (index: number) => number;
  /** 탭 묶음에서 누른 키를 받는다. 탭 위의 ←/→/Home/End로 옆 탭을 고르고 그 탭에 포커스를 옮긴다 */
  handleTabKeyDown: (event: KeyboardEvent, index: number) => void;
};

/**
 * 탭 줄(탐색기 탭, Chrome 탭)의 넘침과 끌어 순서 바꾸기를 맡는다. 앱을 모르는 탭 줄 동작이라 두 앱이 같은 규칙을 쓴다.
 * - 넘침: 탭은 최소 폭까지 고르게 줄고(쓰는 곳의 레이아웃), 그보다 많으면 탭 줄을 가로로 스크롤한다. 고른 탭이 가려지면
 *   보이도록 탭 줄만 스크롤한다.
 * - 키보드: 고른 탭만 Tab 키로 닿고(roving tabindex), 탭에서 ←/→로 앞뒤 탭(끝에서는 반대쪽 끝), Home/End로 처음·끝 탭을
 *   고르며 그 탭에 포커스를 옮긴다.
 * - 끌기: 탭을 누른 뒤 끌기 거리(4px)를 넘게 움직이면, 포인터 가로 자리에 있는 탭 자리로 옮긴다. 끄는 동안 바로 옮긴다.
 *   마우스 왼쪽 버튼과 펜만 받는다. 끄는 동안 탭이 닫히거나 열리면 더 옮기지 않는다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[Chrome:구성]]
 * @param options 고른 탭, 탭 개수, 옮길 때 부를 함수
 * @returns 탭 줄 ref와 끌기 시작 핸들러
 */
export function useTabStrip(options: UseTabStripOptions): TabStripControls {
  const { selectedIndex, tabCount, onTabMove, onTabSelect } = options;
  const tabListRef = useRef<HTMLDivElement>(null);
  // 끄는 동안 탭이 옮겨지면 쓰는 곳이 새 콜백을 넘기므로, 끌기를 시작할 때의 콜백이 아니라 늘 지금 콜백을 부른다.
  const onTabMoveRef = useRef(onTabMove);
  const startPointerDrag = usePointerDrag();

  useEffect(
    /**
     * 지금 콜백을 기억한다.
     */
    () => {
      onTabMoveRef.current = onTabMove;
    },
    [onTabMove],
  );

  useEffect(
    /**
     * 탭 줄이 넘쳐 스크롤할 때, 고른 탭(새로 연 탭 등)이 가려져 있으면 보이도록 탭 줄만 가로로 스크롤한다.
     */
    () => {
      const list = tabListRef.current;
      const selected = list?.children[selectedIndex];
      if (list === null || !(selected instanceof HTMLElement)) {
        return;
      }
      const start = selected.offsetLeft - list.offsetLeft;
      const end = start + selected.offsetWidth;
      if (start < list.scrollLeft) {
        list.scrollLeft = start;
      } else if (end > list.scrollLeft + list.clientWidth) {
        list.scrollLeft = end - list.clientWidth;
      }
    },
    [selectedIndex, tabCount],
  );

  /**
   * 탭을 끌어 순서를 바꾸기 시작한다.
   * @param event 누르기 이벤트
   * @param index 누른 탭의 차례
   */
  function startTabDrag(event: PointerEvent, index: number): void {
    if (onTabMove === undefined) {
      return;
    }
    let current = index;
    const startCount = tabListRef.current?.children.length ?? 0;
    startPointerDrag(event, {
      onMove: (point) => {
        const list = tabListRef.current;
        // 끄는 동안 탭이 닫히거나 열리면 끄던 탭의 차례를 알 수 없어 더 옮기지 않는다.
        if (list === null || list.children.length !== startCount) {
          return;
        }
        const next = getTabIndexAt([...list.children], point.x);
        if (next !== null && next !== current) {
          onTabMoveRef.current?.(current, next);
          current = next;
        }
      },
    });
  }

  /**
   * 탭의 tabIndex. 고른 탭(없으면 첫 탭)만 0이다.
   * @param index 탭 차례
   * @returns tabIndex
   */
  function getTabIndex(index: number): number {
    return index === Math.max(selectedIndex, 0) ? 0 : -1;
  }

  /**
   * 탭 위에서 누른 ←/→/Home/End로 옆 탭을 고르고 포커스를 옮긴다. 닫기 버튼에서 누른 키는 받지 않는다.
   * @param event 키 이벤트
   * @param index 키를 누른 탭의 차례
   */
  function handleTabKeyDown(event: KeyboardEvent, index: number): void {
    if (!(event.target instanceof Element) || event.target.getAttribute('role') !== 'tab') {
      return;
    }
    const next = getNextTabIndex(event.key, index, tabCount);
    if (next === null) {
      return;
    }
    event.preventDefault();
    onTabSelect?.(next);
    const tab = tabListRef.current?.children[next]?.querySelector('[role="tab"]');
    if (tab instanceof HTMLElement) {
      tab.focus();
    }
  }

  return { tabListRef, startTabDrag, getTabIndex, handleTabKeyDown };
}

/**
 * 탭에서 누른 키로 옮겨 갈 탭의 차례를 정한다. ←/→는 앞뒤 탭(끝에서는 반대쪽 끝), Home/End는 처음·끝 탭이다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[Chrome:구성]]
 * @param key 누른 키
 * @param index 지금 탭의 차례
 * @param count 탭 개수
 * @returns 옮겨 갈 탭의 차례. 옮기는 키가 아니거나 탭이 없으면 null
 */
export function getNextTabIndex(key: string, index: number, count: number): number | null {
  if (count === 0) {
    return null;
  }
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * 가로 자리에 있는 탭의 차례를 찾는다. 첫 탭보다 왼쪽이면 첫 탭, 마지막 탭보다 오른쪽이면 마지막 탭이다.
 * @codocs [[파일 탐색기:탭]]
 * @param tabs 탭 요소
 * @param x 화면 가로 자리
 * @returns 탭 차례. 탭이 없으면 null
 */
export function getTabIndexAt(tabs: readonly Element[], x: number): number | null {
  if (tabs.length === 0) {
    return null;
  }
  const index = tabs.findIndex((tab) => {
    const rect = tab.getBoundingClientRect();
    return x < rect.right;
  });
  return index === -1 ? tabs.length - 1 : index;
}
