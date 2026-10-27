import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';

import type { Selection, SelectionDirection } from '@/shared/utils/selection-rules/selection-rules';
import {
  emptySelection,
  pruneSelection,
  selectAll,
  selectMarquee,
  selectOnly,
  selectRange,
  toggleSelection,
} from '@/shared/utils/selection-rules/selection-rules';

type UseSelectionOptions = {
  /** 지금 보이는 항목 id. 표시 순서다(바탕화면은 격자 순서). Shift 범위와 Ctrl + A가 이 순서를 쓴다 */
  orderedIds: readonly string[];
  /** 방향키 방향의 옆 항목을 찾는다. 없으면 null */
  getNeighborId: (fromId: string, direction: SelectionDirection) => string | null;
  /** 여러 개 선택(Ctrl, Shift, Ctrl + A, 끄는 사각형)을 받을지. 모바일은 받지 않는다 */
  isMultiSelectEnabled: boolean;
  /** 방향키로 옮긴 항목에 키보드 포커스를 옮긴다 */
  onFocusItem?: (id: string) => void;
};

/** 선택 상태와 그것을 바꾸는 핸들러 */
type SelectionControls = {
  /** 지금 선택. 사라진 항목은 빠져 있다 */
  selection: Selection;
  /** 선택을 바로 정한다(새 폴더, 우클릭한 항목) */
  setSelection: (selection: Selection) => void;
  /**
   * 항목 위에서 누를 때. Shift는 범위를 고르고, 고르지 않은 항목은 그것만 고른다. 고른 항목은 끌 수 있게 그대로 둔다.
   * 바뀐 선택(끌 항목을 정하는 데 쓴다)을 돌려준다
   */
  handleItemPointerDown: (id: string, event: PointerEvent) => Selection;
  /** 항목을 클릭했을 때(끌지 않고 놓았을 때). Ctrl은 더하거나 빼고, 수정 키가 없으면 그것만 고른다 */
  handleItemClick: (id: string, event: MouseEvent) => void;
  /** 방향키·Ctrl + A를 처리한다. 처리했으면 true(기본 동작을 막았다) */
  handleSelectionKeyDown: (event: KeyboardEvent) => boolean;
  /** 끄는 사각형을 시작한다. 더하기(Ctrl)가 아니면 선택을 비운다 */
  startMarquee: (isAdditive: boolean) => void;
  /** 끄는 사각형에 걸친 항목으로 선택을 바꾼다 */
  updateMarquee: (hitIds: readonly string[]) => void;
};

/**
 * 바탕화면 아이콘과 탐색기 항목의 선택을 포인터와 키보드에 잇는다. 규칙은 `selection-rules`에 있다.
 * - 클릭: 그 항목만 고른다. Ctrl + 클릭: 더하거나 뺀다. Shift + 클릭: 범위 선택의 시작 항목부터 표시 순서로 고른다.
 * - 고른 항목을 누르면 함께 끌 수 있게 선택을 그대로 두고, 끌지 않고 놓으면(클릭) 그 항목만 고른다.
 * - 방향키: 옆 항목으로 선택과 포커스를 옮긴다. Shift + 방향키: 범위를 넓힌다. Ctrl + A: 모두 고른다.
 * - 끄는 사각형: 사각형에 걸친 항목을 고른다. Ctrl을 누르고 시작하면 끌기 전 선택에 더한다.
 * 여러 개 선택을 받지 않으면(모바일) 수정 키는 무시하고 Ctrl + A와 끄는 사각형도 받지 않는다.
 * 보이지 않게 된 항목은 선택에서 뺀다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @codocs [[모바일:차이]]
 * @param options 보이는 항목과 옆 항목 찾기
 * @returns 선택과 핸들러
 */
export function useSelection(options: UseSelectionOptions): SelectionControls {
  const { orderedIds, getNeighborId, isMultiSelectEnabled, onFocusItem } = options;
  const [rawSelection, setSelection] = useState<Selection>(emptySelection);
  const marqueeBaseRef = useRef<{ base: Selection; isAdditive: boolean } | null>(null);
  const selection = pruneSelection(rawSelection, orderedIds);

  /**
   * 항목 위에서 누르면 범위를 고르거나 그 항목만 고른다.
   * @param id 누른 항목 id
   * @param event 누르기 이벤트
   * @returns 바뀐 선택
   */
  function handleItemPointerDown(id: string, event: PointerEvent): Selection {
    let next = selection;
    if (isMultiSelectEnabled && (event.ctrlKey || event.metaKey)) {
      return next;
    }
    if (isMultiSelectEnabled && event.shiftKey) {
      next = selectRange(selection, orderedIds, id);
    } else if (!selection.ids.includes(id)) {
      next = selectOnly(id);
    }
    setSelection(next);
    return next;
  }

  /**
   * 항목을 클릭하면 더하거나 빼고, 수정 키가 없으면 그 항목만 고른다.
   * @param id 클릭한 항목 id
   * @param event 클릭 이벤트
   */
  function handleItemClick(id: string, event: MouseEvent): void {
    if (isMultiSelectEnabled && (event.ctrlKey || event.metaKey)) {
      setSelection(toggleSelection(selection, id));
      return;
    }
    if (isMultiSelectEnabled && event.shiftKey) {
      return;
    }
    setSelection(selectOnly(id));
  }

  /**
   * 방향키와 Ctrl + A를 처리한다.
   * @param event 키 이벤트
   * @returns 처리했으면 true
   */
  function handleSelectionKeyDown(event: KeyboardEvent): boolean {
    if (
      isMultiSelectEnabled &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a'
    ) {
      event.preventDefault();
      setSelection(selectAll(selection, orderedIds));
      return true;
    }
    const direction = getArrowDirection(event.key);
    if (direction === undefined) {
      return false;
    }
    event.preventDefault();
    const fromId = selection.focusId ?? selection.ids.at(-1) ?? null;
    const nextId = fromId === null ? (orderedIds[0] ?? null) : getNeighborId(fromId, direction);
    if (nextId === null) {
      return true;
    }
    setSelection(
      isMultiSelectEnabled && event.shiftKey
        ? selectRange(selection, orderedIds, nextId)
        : selectOnly(nextId),
    );
    onFocusItem?.(nextId);
    return true;
  }

  /**
   * 끄는 사각형을 시작한다.
   * @param isAdditive 끌기 전 선택에 더할지
   */
  function startMarquee(isAdditive: boolean): void {
    const isAdding = isMultiSelectEnabled && isAdditive;
    marqueeBaseRef.current = { base: isAdding ? selection : emptySelection, isAdditive: isAdding };
    if (!isAdding) {
      setSelection(emptySelection);
    }
  }

  /**
   * 끄는 사각형에 걸친 항목으로 선택을 바꾼다.
   * @param hitIds 걸친 항목 id
   */
  function updateMarquee(hitIds: readonly string[]): void {
    const marquee = marqueeBaseRef.current;
    if (marquee === null || !isMultiSelectEnabled) {
      return;
    }
    setSelection(selectMarquee(marquee.base, hitIds, marquee.isAdditive));
  }

  return {
    selection,
    setSelection,
    handleItemPointerDown,
    handleItemClick,
    handleSelectionKeyDown,
    startMarquee,
    updateMarquee,
  };
}

/**
 * 방향키 이름을 방향으로 바꾼다.
 * @param key 키 이름
 * @returns 방향. 방향키가 아니면 undefined
 */
function getArrowDirection(key: string): SelectionDirection | undefined {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return undefined;
  }
}
