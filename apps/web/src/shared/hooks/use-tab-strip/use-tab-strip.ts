import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from 'react';

import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { useReorderMotion } from '@/shared/hooks/use-reorder-motion/use-reorder-motion';
import { getLayoutRect } from '@/shared/utils/layout-rect/layout-rect';

/** 탭 요소(탭 줄의 바로 아래 자식)에 다는 속성. 탭 id를 담는다. 끌어 순서를 바꿀 때 탭을 움직이는 데 쓴다 */
export const TAB_ID_ATTRIBUTE = 'data-tab-id';

/**
 * 탭 줄 훅의 설정
 * - selectedIndex: 고른 탭의 차례
 * - tabCount: 탭 개수
 * - onTabMove: 탭을 끌어 다른 자리로 옮길 때. 옮길 탭의 차례와 옮길 자리를 받는다
 * - onTabSelect: 탭을 고를 때. 고를 탭의 차례를 받는다
 * - onTabClose: 탭을 닫을 때. 닫을 탭의 차례를 받는다
 */
type UseTabStripOptions = {
  selectedIndex: number;
  tabCount: number;
  onTabMove?: (from: number, to: number) => void;
  onTabSelect?: (index: number) => void;
  onTabClose?: (index: number) => void;
};

/**
 * 탭 줄 요소와 탭 끌기 핸들러
 * - tabListRef: 탭 줄(`role="tablist"`) 요소에 다는 ref. 탭 요소는 이 요소의 바로 아래 자식이다
 * - startTabDrag: 탭 위에서 누르면 그 탭을 끌어 순서를 바꾸기 시작한다
 * - handleValueChange: Base UI 탭 줄이 고른 탭을 알릴 때(키보드 이동, 탭 누르기)
 * - handleTabClick: 탭 묶음을 눌렀을 때. 탭 바깥 여백을 눌러도 탭을 고른다. 탭 위는 Base UI가 맡는다
 * - handleTabKeyDown: 탭 묶음에서 누른 키를 받는다. 탭 위의 Delete로 그 탭을 닫는다
 * - closeTab: 탭을 닫는다. 포커스가 탭 줄에 있었으면 닫은 뒤 고른 탭으로 옮긴다
 */
type TabStripControls = {
  tabListRef: RefObject<HTMLDivElement | null>;
  startTabDrag: (event: PointerEvent, index: number) => void;
  handleValueChange: (value: number) => void;
  handleTabClick: (event: MouseEvent, index: number) => void;
  handleTabKeyDown: (event: KeyboardEvent, index: number) => void;
  closeTab: (index: number) => void;
};

/**
 * 탭 줄(탐색기 탭, Chrome 탭)의 넘침, 끌어 순서 바꾸기, 닫기를 맡는다. 앱을 모르는 탭 줄 동작이라 두 앱이 같은 규칙을 쓴다.
 * Tab·←/→/Home/End는 Base UI `Tabs`가 맡는다.
 * - 넘침: 탭은 최소 폭까지 고르게 줄고(쓰는 곳의 레이아웃), 그보다 많으면 탭 줄을 가로로 스크롤한다. 고른 탭이 가려지면
 *   보이도록 탭 줄만 스크롤한다.
 * - 닫기: 탭에서 Delete로 닫는다. 포커스가 탭 줄에 있었으면 닫은 뒤 고른 탭으로 옮긴다(가장 가까운 내용).
 * - 끌기: 탭을 누른 뒤 끌기 거리(4px)를 넘게 움직이면, 포인터 가로 자리에 있는 탭 자리로 옮긴다. 끄는 동안 바로 옮긴다.
 *   마우스 왼쪽 버튼과 펜만 받는다. 끄는 동안 탭이 닫히거나 열리면 더 옮기지 않는다.
 *   끄는 탭은 커진 채 포인터를 가로로 따라오고, 밀려나는 탭은 새 자리로 미끄러지고, 놓으면 새 자리로 들어간다(`useReorderMotion`).
 *   탭이 움직이려면 탭 요소에 `data-tab-id`(`TAB_ID_ATTRIBUTE`)로 탭 id를 달아야 한다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[항목 조작:순서 바꾸기 끌기]]
 * @codocs [[Chrome:구성]]
 * @codocs [[접근성:포커스]]
 * @param options 고른 탭, 탭 개수, 옮길 때 부를 함수
 * @returns 탭 줄 ref와 핸들러
 */
export function useTabStrip(options: UseTabStripOptions): TabStripControls {
  const { selectedIndex, tabCount, onTabMove, onTabSelect, onTabClose } = options;
  const tabListRef = useRef<HTMLDivElement>(null);
  // 탭을 닫은 뒤 고른 탭으로 포커스를 옮길지.
  const shouldFocusSelectedRef = useRef(false);
  // 끄는 동안 탭이 옮겨지면 쓰는 곳이 새 콜백을 넘기므로, 끌기를 시작할 때의 콜백이 아니라 늘 지금 콜백을 부른다.
  const onTabMoveRef = useRef(onTabMove);
  const startPointerDrag = usePointerDrag();
  const reorderMotion = useReorderMotion(tabListRef, {
    itemAttribute: TAB_ID_ATTRIBUTE,
    axis: 'x',
  });

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
      // 탭 줄의 양옆 안쪽 여백(Chrome 활성 탭의 모서리 조각 자리)까지 보이게 한다.
      const style = getComputedStyle(list);
      const tabStart = selected.offsetLeft - list.offsetLeft;
      const start = tabStart - (Number.parseFloat(style.paddingLeft) || 0);
      const end = tabStart + selected.offsetWidth + (Number.parseFloat(style.paddingRight) || 0);
      if (start < list.scrollLeft) {
        list.scrollLeft = start;
      } else if (end > list.scrollLeft + list.clientWidth) {
        list.scrollLeft = end - list.clientWidth;
      }
    },
    [selectedIndex, tabCount],
  );

  useEffect(
    /** 포커스가 탭 줄에 있는 채 탭을 닫았으면, 다시 그린 뒤 고른 탭으로 옮긴다. */
    () => {
      if (!shouldFocusSelectedRef.current) {
        return;
      }
      shouldFocusSelectedRef.current = false;
      const tab = tabListRef.current?.children[selectedIndex]?.querySelector('[role="tab"]');
      if (tab instanceof HTMLElement) {
        tab.focus();
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
    const tab = event.currentTarget;
    startPointerDrag(event, {
      onStart: (start, point) => {
        reorderMotion.startDrag(tab, start, point);
      },
      onMove: (point) => {
        reorderMotion.moveDrag(point);
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
      onDrop: reorderMotion.endDrag,
      onCancel: reorderMotion.endDrag,
    });
  }

  /**
   * Base UI 탭 줄이 고른 탭을 쓰는 곳에 알린다.
   * @param value 고른 탭의 차례
   */
  function handleValueChange(value: number): void {
    onTabSelect?.(value);
  }

  /**
   * 탭 바깥 여백을 누르면 그 탭을 고른다. 탭 위는 Base UI가 고른다.
   * @param event 누르기 이벤트
   * @param index 누른 탭의 차례
   */
  function handleTabClick(event: MouseEvent, index: number): void {
    if (event.target instanceof Element && event.target.closest('[role="tab"]') !== null) {
      return;
    }
    onTabSelect?.(index);
  }

  /**
   * 탭을 닫는다.
   * @param index 닫을 탭의 차례
   */
  function closeTab(index: number): void {
    shouldFocusSelectedRef.current = tabListRef.current?.contains(document.activeElement) === true;
    onTabClose?.(index);
  }

  /**
   * 탭 위에서 누른 Delete로 그 탭을 닫는다.
   * @param event 키 이벤트
   * @param index 키를 누른 탭의 차례
   */
  function handleTabKeyDown(event: KeyboardEvent, index: number): void {
    if (
      event.key === 'Delete' &&
      event.target instanceof Element &&
      event.target.getAttribute('role') === 'tab'
    ) {
      event.preventDefault();
      closeTab(index);
    }
  }

  return {
    tabListRef,
    startTabDrag,
    handleValueChange,
    handleTabClick,
    handleTabKeyDown,
    closeTab,
  };
}

/**
 * 가로 자리에 있는 탭의 차례를 찾는다. 첫 탭보다 왼쪽이면 첫 탭, 마지막 탭보다 오른쪽이면 마지막 탭이다.
 * 끄는 탭과 미끄러지는 탭의 움직이는 모습이 아니라 원래 자리(`getLayoutRect`)로 찾는다.
 * @codocs [[파일 탐색기:탭]]
 * @codocs [[항목 조작:순서 바꾸기 끌기]]
 * @param tabs 탭 요소
 * @param x 화면 가로 자리
 * @returns 탭 차례. 탭이 없으면 null
 */
export function getTabIndexAt(tabs: readonly Element[], x: number): number | null {
  if (tabs.length === 0) {
    return null;
  }
  const index = tabs.findIndex((tab) => {
    const rect = getLayoutRect(tab);
    return x < rect.right;
  });
  return index === -1 ? tabs.length - 1 : index;
}
