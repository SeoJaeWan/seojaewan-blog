// 바탕화면 아이콘 격자의 규칙(칸 크기, 자동 정렬, 빈 칸 찾기, 끌어 옮기기)을 React 밖의 순수 함수로 모은다.
// 저장은 작업 공간 저장소의 바탕화면 설정(`desktop.positions`)이 갖고, 화면은 여기서 계산한 칸에 아이콘을 놓는다.

import type {
  DesktopIconSize,
  DesktopSortKey,
  GridCell,
  WorkspaceItem,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 격자 크기(칸 수) */
export type GridSize = {
  /** 열 수 */
  columns: number;
  /** 행 수 */
  rows: number;
};

/** 화면 위 자리(px). 아이콘 영역 왼쪽 위가 원점이다 */
export type GridPoint = {
  /** 가로 */
  x: number;
  /** 세로 */
  y: number;
};

/** 아이콘 칸 하나의 크기(px). 아이콘(FileItem) 크기와 아이콘 사이 간격이다 */
type CellGeometry = {
  /** 아이콘 너비. FileItem `Surface=Desktop`의 View별 너비다 */
  itemWidth: number;
  /** 이름 한 줄인 아이콘 높이. 위아래 여백 4씩 + 아이콘 + 간격 2 + 글자 한 줄 16이다 */
  itemHeight: number;
};

/** 아이콘 영역 가장자리 여백(피그마 Desktop/Scene icons 프레임의 padding 8) */
export const GRID_PADDING = 8;

/** 아이콘 사이 간격(피그마 icons 프레임의 gap 16) */
export const GRID_GAP = 16;

// FileItem `Surface=Desktop`의 View별 크기다. 너비는 FileItem이 정한 값(112·76·76),
// 높이는 위아래 여백(4+4)과 아이콘(96·48·32), 이름과의 간격(2), caption 글자 한 줄(16)을 더한 값이다.
// 이름이 두 줄이면 아이콘이 아래 간격만큼 길어지지만 칸은 그대로다(Windows처럼 칸은 일정하다).
const cellGeometries = {
  large: { itemWidth: 112, itemHeight: 122 },
  medium: { itemWidth: 76, itemHeight: 74 },
  small: { itemWidth: 76, itemHeight: 58 },
} as const satisfies Record<DesktopIconSize, CellGeometry>;

// 정렬할 때 항목 유형의 차례. 휴지통은 늘 맨 앞(Windows 바탕화면의 시스템 아이콘처럼), 그다음 폴더, 글, 외부 링크다.
const kindOrder = { 'recycle-bin': 0, folder: 1, post: 2, link: 3 } as const satisfies Record<
  WorkspaceItem['kind'],
  number
>;

/**
 * 아이콘 크기에 맞는 칸 하나의 크기를 돌려준다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param iconSize 아이콘 크기
 * @returns 아이콘 너비·높이와 칸 간격(다음 칸까지의 거리)
 */
export function getCellGeometry(iconSize: DesktopIconSize): CellGeometry & {
  /** 다음 열까지의 거리 */
  pitchX: number;
  /** 다음 행까지의 거리 */
  pitchY: number;
} {
  const geometry = cellGeometries[iconSize];
  return {
    ...geometry,
    pitchX: geometry.itemWidth + GRID_GAP,
    pitchY: geometry.itemHeight + GRID_GAP,
  };
}

/**
 * 아이콘 영역 크기에 들어가는 격자 칸 수를 구한다. 아이콘이 영역 밖으로 잘리지 않는 칸만 센다. 영역이 작아도 1×1이다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param area 아이콘 영역 크기
 * @param area.width 너비
 * @param area.height 높이
 * @param iconSize 아이콘 크기
 * @returns 격자 크기
 */
export function getGridSize(
  area: { width: number; height: number },
  iconSize: DesktopIconSize,
): GridSize {
  const { itemWidth, itemHeight, pitchX, pitchY } = getCellGeometry(iconSize);
  return {
    columns: Math.max(1, Math.floor((area.width - GRID_PADDING * 2 - itemWidth) / pitchX) + 1),
    rows: Math.max(1, Math.floor((area.height - GRID_PADDING * 2 - itemHeight) / pitchY) + 1),
  };
}

/**
 * 칸의 왼쪽 위 자리를 구한다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param cell 칸
 * @param iconSize 아이콘 크기
 * @returns 칸 왼쪽 위(px)
 */
export function getCellOrigin(cell: GridCell, iconSize: DesktopIconSize): GridPoint {
  const { pitchX, pitchY } = getCellGeometry(iconSize);
  return { x: GRID_PADDING + cell.column * pitchX, y: GRID_PADDING + cell.row * pitchY };
}

/**
 * 자리에 가장 가까운 칸을 구한다. 끌어 놓은 아이콘의 왼쪽 위 자리로 놓일 칸을 찾는 데 쓴다. 격자 밖이면 가장자리 칸이다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param point 아이콘 왼쪽 위 자리
 * @param iconSize 아이콘 크기
 * @param grid 격자 크기
 * @returns 칸
 */
export function getNearestCell(
  point: GridPoint,
  iconSize: DesktopIconSize,
  grid: GridSize,
): GridCell {
  const { pitchX, pitchY } = getCellGeometry(iconSize);
  return {
    column: clamp(Math.round((point.x - GRID_PADDING) / pitchX), 0, grid.columns - 1),
    row: clamp(Math.round((point.y - GRID_PADDING) / pitchY), 0, grid.rows - 1),
  };
}

/**
 * 격자 순서(위에서 아래, 그다음 왼쪽에서 오른쪽, 열 우선)의 n번째 칸을 구한다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param index 순서(0부터)
 * @param grid 격자 크기
 * @returns 칸
 */
export function getCellAtIndex(index: number, grid: GridSize): GridCell {
  return { column: Math.floor(index / grid.rows), row: index % grid.rows };
}

/**
 * 칸의 격자 순서를 구한다(열 우선).
 * @codocs [[바탕화면:아이콘 배치]]
 * @param cell 칸
 * @param grid 격자 크기
 * @returns 순서(0부터)
 */
export function getCellIndex(cell: GridCell, grid: GridSize): number {
  return cell.column * grid.rows + cell.row;
}

/**
 * 바탕화면 항목을 정렬 기준으로 늘어놓는다. 휴지통은 늘 맨 앞이다.
 * 이름순은 숫자를 값으로 비교하고(`2`가 `10`보다 앞), 영어가 한글보다 앞이다(Windows 탐색기와 같은 차례).
 * - 이름: 폴더를 먼저, 그 안에서 이름순(Windows 바탕화면처럼)
 * - 항목 유형: 폴더, 글, 외부 링크 차례, 같은 유형은 이름순
 * - 수정한 날짜: 최근 것을 먼저, 날짜가 없는 항목(Notion 폴더, 외부 링크)은 뒤에 이름순
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @param items 바탕화면 항목
 * @param sortBy 정렬 기준
 * @returns 정렬한 항목
 */
export function sortDesktopItems<Item extends Pick<WorkspaceItem, 'kind' | 'name' | 'date'>>(
  items: readonly Item[],
  sortBy: DesktopSortKey,
): Item[] {
  return [...items].sort(
    /**
     * 두 항목의 차례를 비교한다.
     * @param a 항목
     * @param b 항목
     * @returns 비교 값
     */
    (a, b) => {
      const isRecycleBinFirst = Number(b.kind === 'recycle-bin') - Number(a.kind === 'recycle-bin');
      if (isRecycleBinFirst !== 0) {
        return isRecycleBinFirst;
      }
      const byName = a.name.localeCompare(b.name, 'en', { numeric: true });
      switch (sortBy) {
        case 'name':
          return Number(b.kind === 'folder') - Number(a.kind === 'folder') || byName;
        case 'type':
          return kindOrder[a.kind] - kindOrder[b.kind] || byName;
        case 'modified':
          return compareDatesNewestFirst(a.date, b.date) || byName;
      }
    },
  );
}

/**
 * 항목을 차례대로 격자 순서의 칸에 채운다(자동 정렬).
 * @codocs [[바탕화면:아이콘 배치]]
 * @param orderedIds 차례대로 놓을 항목 id
 * @param grid 격자 크기
 * @returns 항목 id별 칸
 */
export function arrangeInGridOrder(
  orderedIds: readonly string[],
  grid: GridSize,
): Record<string, GridCell> {
  return Object.fromEntries(orderedIds.map((id, index) => [id, getCellAtIndex(index, grid)]));
}

/**
 * 바탕화면 아이콘의 칸을 정한다. 자동 정렬이 켜져 있으면 정렬 기준의 차례로 격자 순서대로 채우고,
 * 꺼져 있으면 저장한 칸에 둔다(`placeIcons`).
 * @codocs [[바탕화면:아이콘 배치]]
 * @param items 바탕화면 항목(넣은 차례)
 * @param settings 바탕화면 설정
 * @param settings.isAutoArrange 자동 정렬을 하는지(모바일은 늘 한다)
 * @param settings.sortBy 정렬 기준
 * @param settings.positions 저장한 칸
 * @param grid 격자 크기
 * @returns 항목 id별 칸
 */
export function layoutDesktopIcons(
  items: readonly Pick<WorkspaceItem, 'id' | 'kind' | 'name' | 'date'>[],
  settings: {
    isAutoArrange: boolean;
    sortBy: DesktopSortKey;
    positions: Readonly<Record<string, GridCell>>;
  },
  grid: GridSize,
): Record<string, GridCell> {
  if (settings.isAutoArrange) {
    return arrangeInGridOrder(
      sortDesktopItems(items, settings.sortBy).map((item) => item.id),
      grid,
    );
  }
  return placeIcons(
    items.map((item) => item.id),
    settings.positions,
    grid,
  );
}

/**
 * 칸에 놓인 항목 id를 격자 순서(열 우선)로 늘어놓는다. Shift 범위 선택과 Ctrl + A가 이 순서를 쓴다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param cells 항목 id별 칸
 * @param grid 격자 크기
 * @returns 격자 순서의 항목 id
 */
export function getGridOrder(cells: Readonly<Record<string, GridCell>>, grid: GridSize): string[] {
  return Object.entries(cells)
    .sort(([, a], [, b]) => getCellIndex(a, grid) - getCellIndex(b, grid))
    .map(([id]) => id);
}

/**
 * 자동 정렬을 끈 바탕화면의 아이콘 칸을 정한다.
 * 1. 저장한 칸이 격자 안이고 비어 있으면 그 칸에 둔다(같은 칸이 겹치면 앞 항목이 갖는다).
 * 2. 화면이 작아져 저장한 칸이 격자 밖이면 그 칸에서 가장 가까운 빈 칸으로 옮긴다(저장한 칸은 바꾸지 않아 화면이 커지면 돌아간다).
 * 3. 칸이 없는 항목(새 항목)은 격자 순서로 첫 빈 칸에 둔다.
 * 빈 칸이 없으면 격자 오른쪽 밖으로 이어 놓는다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param ids 바탕화면 항목 id(넣은 차례)
 * @param positions 저장한 칸
 * @param grid 격자 크기
 * @returns 항목 id별 칸
 */
export function placeIcons(
  ids: readonly string[],
  positions: Readonly<Record<string, GridCell>>,
  grid: GridSize,
): Record<string, GridCell> {
  const result: Record<string, GridCell> = {};
  const taken = new Set<number>();
  const outside: string[] = [];
  const unplaced: string[] = [];
  for (const id of ids) {
    const saved = positions[id];
    if (saved === undefined) {
      unplaced.push(id);
    } else if (!isInsideGrid(saved, grid)) {
      outside.push(id);
    } else if (taken.has(getCellIndex(saved, grid))) {
      unplaced.push(id);
    } else {
      result[id] = saved;
      taken.add(getCellIndex(saved, grid));
    }
  }
  for (const id of outside) {
    const saved = positions[id];
    if (saved !== undefined) {
      result[id] = takeNearestFreeCell(saved, grid, taken);
    }
  }
  for (const id of unplaced) {
    result[id] = takeFirstFreeCell(grid, taken);
  }
  return result;
}

/**
 * 격자 순서로 첫 빈 칸을 찾는다(자동 정렬을 끈 바탕화면에 새 항목을 놓을 칸).
 * @codocs [[바탕화면:아이콘 배치]]
 * @param cells 지금 놓인 칸
 * @param grid 격자 크기
 * @returns 빈 칸
 */
export function getFirstFreeCell(
  cells: Readonly<Record<string, GridCell>>,
  grid: GridSize,
): GridCell {
  return takeFirstFreeCell(grid, takenIndexes(Object.values(cells), grid));
}

/**
 * 끈 아이콘들을 놓은 칸으로 옮긴다(자동 정렬을 끈 바탕화면). 잡은 아이콘이 놓은 칸에 가고, 함께 끈 아이콘은 잡은 아이콘과의 칸 차이를 지킨다.
 * 그 칸이 격자 밖이거나 다른 아이콘이 차지했으면 가장 가까운 빈 칸으로 간다. 끌지 않은 아이콘은 그대로다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param cells 지금 놓인 칸
 * @param movingIds 끈 아이콘 id(차례대로 칸을 정한다)
 * @param anchorId 잡은 아이콘 id
 * @param dropCell 잡은 아이콘을 놓은 칸
 * @param grid 격자 크기
 * @returns 옮긴 뒤 항목 id별 칸
 */
export function moveIconsToCell(
  cells: Readonly<Record<string, GridCell>>,
  movingIds: readonly string[],
  anchorId: string,
  dropCell: GridCell,
  grid: GridSize,
): Record<string, GridCell> {
  const anchor = cells[anchorId];
  if (anchor === undefined) {
    return { ...cells };
  }
  const moving = new Set(movingIds);
  const result: Record<string, GridCell> = { ...cells };
  const taken = takenIndexes(
    Object.entries(cells)
      .filter(([id]) => !moving.has(id))
      .map(([, cell]) => cell),
    grid,
  );
  // 잡은 아이콘을 먼저 놓아 놓은 칸을 차지하게 한다.
  const ordered = [anchorId, ...movingIds.filter((id) => id !== anchorId)];
  for (const id of ordered) {
    const from = cells[id];
    if (from === undefined) {
      continue;
    }
    const wanted = {
      column: from.column + dropCell.column - anchor.column,
      row: from.row + dropCell.row - anchor.row,
    };
    result[id] = takeNearestFreeCell(wanted, grid, taken);
  }
  return result;
}

/**
 * 칸이 격자 안인지 본다.
 * @param cell 칸
 * @param grid 격자 크기
 * @returns 안이면 true
 */
function isInsideGrid(cell: GridCell, grid: GridSize): boolean {
  return cell.column >= 0 && cell.row >= 0 && cell.column < grid.columns && cell.row < grid.rows;
}

/**
 * 칸들의 격자 순서를 모은다. 격자 밖 칸은 뺀다.
 * @param cells 칸
 * @param grid 격자 크기
 * @returns 차지한 순서
 */
function takenIndexes(cells: readonly GridCell[], grid: GridSize): Set<number> {
  return new Set(
    cells.filter((cell) => isInsideGrid(cell, grid)).map((cell) => getCellIndex(cell, grid)),
  );
}

/**
 * 격자 순서로 첫 빈 칸을 차지한다. 격자가 차면 격자 오른쪽 밖으로 이어 간다.
 * @param grid 격자 크기
 * @param taken 차지한 순서. 차지한 칸을 더한다
 * @returns 칸
 */
function takeFirstFreeCell(grid: GridSize, taken: Set<number>): GridCell {
  let index = 0;
  while (taken.has(index)) {
    index += 1;
  }
  taken.add(index);
  return getCellAtIndex(index, grid);
}

/**
 * 원하는 칸에서 가장 가까운 빈 칸을 차지한다. 원하는 칸을 격자 안으로 당긴 뒤 거리(칸 단위)가 가장 짧은 빈 칸이고,
 * 거리가 같으면 격자 순서가 앞인 칸이다. 빈 칸이 없으면 격자 오른쪽 밖으로 이어 간다.
 * @param wanted 원하는 칸
 * @param grid 격자 크기
 * @param taken 차지한 순서. 차지한 칸을 더한다
 * @returns 칸
 */
function takeNearestFreeCell(wanted: GridCell, grid: GridSize, taken: Set<number>): GridCell {
  const target = {
    column: clamp(wanted.column, 0, grid.columns - 1),
    row: clamp(wanted.row, 0, grid.rows - 1),
  };
  let best: { index: number; distance: number } | null = null;
  for (let index = 0; index < grid.columns * grid.rows; index += 1) {
    if (taken.has(index)) {
      continue;
    }
    const cell = getCellAtIndex(index, grid);
    const distance = Math.hypot(cell.column - target.column, cell.row - target.row);
    if (best === null || distance < best.distance) {
      best = { index, distance };
    }
  }
  if (best === null) {
    return takeFirstFreeCell(grid, taken);
  }
  taken.add(best.index);
  return getCellAtIndex(best.index, grid);
}

/**
 * 날짜를 최근 것이 앞에 오게 비교한다. 날짜가 없으면 뒤로 보낸다.
 * @param a 날짜(ISO 8601이나 YYYY-MM-DD)
 * @param b 날짜
 * @returns 비교 값
 */
function compareDatesNewestFirst(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return b.localeCompare(a);
}

/**
 * 값을 범위 안으로 당긴다.
 * @param value 값
 * @param min 최솟값
 * @param max 최댓값
 * @returns 범위 안의 값
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
