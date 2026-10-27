// 아이콘을 고르는 규칙을 React 밖의 순수 함수로 모은다. 바탕화면이 쓰고, 탐색기가 쓰게 되면 shared로 옮긴다.
// 포인터·키보드를 이 규칙에 잇는 것은 `features/desktop/hooks/use-selection`이다.

/** 고른 항목. 바탕화면·탐색기의 선택 상태다 */
export type Selection = {
  /** 고른 항목 id. 고른 차례다 */
  ids: readonly string[];
  /** 범위 선택(Shift)의 시작 항목. 마지막으로 하나를 고르거나 Ctrl로 더한 항목이다 */
  anchorId: string | null;
  /** 키보드 포커스가 있는 항목. 방향키는 이 항목에서 옆 항목으로 옮긴다 */
  focusId: string | null;
};

/** 격자 위 칸 좌표. 열과 행은 0부터 센다 */
export type SelectionCell = {
  /** 열 */
  column: number;
  /** 행 */
  row: number;
};

/** 화면 위 사각형(px). 끄는 사각형과 항목 자리에 쓴다 */
export type SelectionRect = {
  /** 왼쪽 */
  x: number;
  /** 위쪽 */
  y: number;
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
};

/** 방향키 방향 */
export type SelectionDirection = 'up' | 'down' | 'left' | 'right';

/** 아무것도 고르지 않은 상태 */
export const emptySelection: Selection = { ids: [], anchorId: null, focusId: null };

// 방향키로 옆 칸을 찾을 때, 가는 방향과 다른 축으로 벗어난 칸에 주는 무게. 같은 줄의 칸을 먼저 고르게 한다.
const CROSS_AXIS_WEIGHT = 2;

/**
 * 항목 하나만 고른다(클릭, 방향키).
 * @codocs [[바탕화면:아이콘 조작]]
 * @param id 고를 항목 id
 * @returns 새 선택
 */
export function selectOnly(id: string): Selection {
  return { ids: [id], anchorId: id, focusId: id };
}

/**
 * 항목을 선택에 더하거나 뺀다(Ctrl + 클릭). 더하거나 뺀 항목이 범위 선택의 시작이 된다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param selection 지금 선택
 * @param id 더하거나 뺄 항목 id
 * @returns 새 선택
 */
export function toggleSelection(selection: Selection, id: string): Selection {
  const isSelected = selection.ids.includes(id);
  return {
    ids: isSelected ? selection.ids.filter((selected) => selected !== id) : [...selection.ids, id],
    anchorId: id,
    focusId: id,
  };
}

/**
 * 범위 선택의 시작 항목부터 항목까지 표시 순서로 고른다(Shift + 클릭, Shift + 방향키). 시작 항목이 없으면 그 항목 하나다.
 * 시작 항목은 그대로 두어 이어서 범위를 바꿀 수 있다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @codocs [[바탕화면:아이콘 배치]]
 * @param selection 지금 선택
 * @param orderedIds 표시 순서의 항목 id(바탕화면은 격자 순서)
 * @param id 범위의 끝 항목 id
 * @returns 새 선택
 */
export function selectRange(
  selection: Selection,
  orderedIds: readonly string[],
  id: string,
): Selection {
  const anchorIndex = selection.anchorId === null ? -1 : orderedIds.indexOf(selection.anchorId);
  const index = orderedIds.indexOf(id);
  if (anchorIndex === -1 || index === -1) {
    return selectOnly(id);
  }
  const start = Math.min(anchorIndex, index);
  const end = Math.max(anchorIndex, index);
  return { ids: orderedIds.slice(start, end + 1), anchorId: selection.anchorId, focusId: id };
}

/**
 * 모든 항목을 고른다(Ctrl + A). 포커스는 그대로 두고, 없으면 첫 항목이다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param selection 지금 선택
 * @param orderedIds 표시 순서의 항목 id
 * @returns 새 선택
 */
export function selectAll(selection: Selection, orderedIds: readonly string[]): Selection {
  const focusId = selection.focusId ?? orderedIds[0] ?? null;
  return { ids: [...orderedIds], anchorId: selection.anchorId ?? focusId, focusId };
}

/**
 * 끄는 사각형에 걸친 항목을 고른다. 더하기(Ctrl)면 끌기 전 선택에 걸친 항목을 더한다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param base 끌기를 시작할 때의 선택
 * @param hitIds 사각형에 걸친 항목 id(표시 순서)
 * @param isAdditive 끌기 전 선택에 더할지
 * @returns 새 선택
 */
export function selectMarquee(
  base: Selection,
  hitIds: readonly string[],
  isAdditive: boolean,
): Selection {
  const ids = isAdditive ? [...new Set([...base.ids, ...hitIds])] : [...hitIds];
  const focusId = hitIds.at(-1) ?? (isAdditive ? base.focusId : null);
  return { ids, anchorId: hitIds[0] ?? (isAdditive ? base.anchorId : null), focusId };
}

/**
 * 사라진 항목을 선택에서 뺀다(휴지통으로 보내거나 폴더로 옮긴 항목).
 * @param selection 지금 선택
 * @param existingIds 지금 보이는 항목 id
 * @returns 새 선택. 바뀐 것이 없으면 그대로다
 */
export function pruneSelection(selection: Selection, existingIds: readonly string[]): Selection {
  const existing = new Set(existingIds);
  const ids = selection.ids.filter((id) => existing.has(id));
  const anchorId =
    selection.anchorId !== null && existing.has(selection.anchorId) ? selection.anchorId : null;
  const focusId =
    selection.focusId !== null && existing.has(selection.focusId) ? selection.focusId : null;
  if (
    ids.length === selection.ids.length &&
    anchorId === selection.anchorId &&
    focusId === selection.focusId
  ) {
    return selection;
  }
  return { ids, anchorId, focusId };
}

/**
 * 항목들을 지운 뒤 포커스와 선택을 옮길 항목을 찾는다. 지운 항목 가운데 마지막 것 다음(표시 순서)의 남은 항목이고,
 * 없으면 마지막 지운 항목 앞의 가장 가까운 남은 항목, 그것도 없으면 null(영역)이다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param orderedIds 지우기 전 표시 순서의 항목 id
 * @param removedIds 지운 항목 id
 * @returns 옮길 항목 id. 없으면 null
 */
export function getIdAfterRemoval(
  orderedIds: readonly string[],
  removedIds: readonly string[],
): string | null {
  const removed = new Set(removedIds);
  const indexes = orderedIds.flatMap((id, index) => (removed.has(id) ? [index] : []));
  const last = indexes.at(-1);
  if (last === undefined) {
    return null;
  }
  const after = orderedIds.slice(last + 1).find((id) => !removed.has(id));
  const before = orderedIds.slice(0, last).findLast((id) => !removed.has(id));
  return after ?? before ?? null;
}

/**
 * 격자에서 방향키 방향의 옆 항목을 찾는다. 그 방향에 있는 항목 가운데 가장 가까운 것이고,
 * 다른 축으로 벗어난 거리에 무게를 더 주어 같은 줄(열)의 항목을 먼저 고른다. 그 방향에 항목이 없으면 null이다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param cells 항목 id별 칸
 * @param fromId 지금 항목 id
 * @param direction 방향
 * @returns 옆 항목 id. 없으면 null
 */
export function getNeighborInGrid(
  cells: Readonly<Record<string, SelectionCell>>,
  fromId: string,
  direction: SelectionDirection,
): string | null {
  const from = cells[fromId];
  if (from === undefined) {
    return null;
  }
  let best: { id: string; score: number } | null = null;
  for (const [id, cell] of Object.entries(cells)) {
    const columnDelta = cell.column - from.column;
    const rowDelta = cell.row - from.row;
    const isVertical = direction === 'up' || direction === 'down';
    const main = { up: -rowDelta, down: rowDelta, left: -columnDelta, right: columnDelta }[
      direction
    ];
    if (id === fromId || main <= 0) {
      continue;
    }
    const cross = Math.abs(isVertical ? columnDelta : rowDelta);
    const score = main + cross * CROSS_AXIS_WEIGHT;
    if (best === null || score < best.score) {
      best = { id, score };
    }
  }
  return best?.id ?? null;
}

/**
 * 두 점을 꼭짓점으로 하는 사각형을 만든다(끄는 사각형).
 * @param start 누른 자리
 * @param start.x 가로
 * @param start.y 세로
 * @param end 지금 자리
 * @param end.x 가로
 * @param end.y 세로
 * @returns 사각형
 */
export function getRectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/**
 * 두 사각형이 겹치는지 본다. 끄는 사각형에 걸친 항목을 찾는 데 쓴다.
 * @param a 사각형
 * @param b 사각형
 * @returns 겹치면 true
 */
export function isRectIntersecting(a: SelectionRect, b: SelectionRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
