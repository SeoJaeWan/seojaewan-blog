// 작업 공간 저장소의 항목을 Start와 검색 화면이 그리는 모양(`StartItem`, `SearchItem`)으로 바꾸는 규칙이다.

import type { SearchItem } from '@/features/start-menu/components/search-body/search-body';
import type {
  StartAllView,
  StartItem,
  StartItemGroup,
} from '@/features/start-menu/components/start-body/start-body';
import { startApps } from '@/features/start-menu/data/start-apps/start-apps';
import {
  compareStartTitles,
  groupByStartLetter,
} from '@/features/start-menu/utils/start-letter-rules/start-letter-rules';
import {
  getAppFromItemId,
  getVisibleStartPins,
  isItemInTrash,
  type PlacedItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 고정 항목 칸 요소에 다는 속성. 끌어 순서를 바꿀 때 포인터 아래의 칸을 항목 id로 찾는다 */
export const START_TILE_ID_ATTRIBUTE = 'data-start-tile-id';

// 범주 보기의 묶음 차례와 머리글이다. 폴더, 글, 외부 링크, 앱 차례다.
const CATEGORY_GROUPS = [
  { label: '폴더', kind: 'folder' },
  { label: '글', kind: 'post' },
  { label: '외부 링크', kind: 'link' },
  { label: '앱', kind: 'app' },
] as const;

/**
 * 작업 공간 항목 하나를 Start 항목으로 바꾼다.
 * @param item 폴더, 글, 외부 링크
 * @returns Start 항목
 */
export function toStartItem(item: PlacedItem): StartItem {
  return { id: item.id, kind: item.kind, title: item.name };
}

/**
 * 항목 id에서 Start 항목을 찾는다. 앱 id면 앱 항목이다.
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @returns Start 항목. 없는 항목이거나 휴지통이면 null
 */
export function getStartItem(state: Pick<WorkspaceState, 'items'>, id: string): StartItem | null {
  const app = getAppFromItemId(id);
  if (app !== null) {
    return startApps.find((startApp) => startApp.app === app) ?? null;
  }
  const item = state.items[id];
  return item === undefined || item.kind === 'recycle-bin' ? null : toStartItem(item);
}

/**
 * Start 고정됨에 그릴 항목을 고정한 순서대로 돌려준다. 휴지통에 들어간 항목은 빠지고, 복원하면 다시 보인다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param state 작업 공간 상태
 * @returns 고정 항목
 */
export function getPinnedStartItems(state: WorkspaceState): StartItem[] {
  return getVisibleStartPins(state).flatMap((id) => {
    const item = getStartItem(state, id);
    return item === null ? [] : [item];
  });
}

/**
 * 모두 목록에 나오는 항목을 돌려준다. 앱과 휴지통 밖의 폴더·글·외부 링크다. 휴지통과 그 안의 항목은 뺀다.
 * @codocs [[Start 메뉴:모두]]
 * @param state 작업 공간 상태
 * @returns 모두 목록의 항목
 */
export function getAllStartItems(state: Pick<WorkspaceState, 'items'>): StartItem[] {
  const items = Object.values(state.items).flatMap((item) =>
    item.kind === 'recycle-bin' || isItemInTrash(state, item.id) ? [] : [toStartItem(item)],
  );
  return [...startApps, ...items];
}

/**
 * 모두 목록을 보기에 맞게 묶는다. 간단히·그리드는 첫 글자별(글자 격자 차례), 범주는 항목 종류별이고 묶음 안은 이름순이다.
 * 항목이 없는 묶음은 만들지 않는다.
 * @codocs [[Start 메뉴:모두]]
 * @param items 모두 목록의 항목
 * @param view 보기
 * @returns 묶음
 */
export function groupStartItems(items: readonly StartItem[], view: StartAllView): StartItemGroup[] {
  if (view !== 'category') {
    return groupByStartLetter(items);
  }
  return CATEGORY_GROUPS.flatMap(
    /**
     * 종류 하나의 묶음을 만든다. 항목이 없으면 묶음을 만들지 않는다.
     * @param group 묶음 머리글과 종류
     * @returns 묶음이 있으면 하나, 없으면 빈 배열
     */
    (group) => {
      const inGroup = items
        .filter((item) => item.kind === group.kind)
        .toSorted((a, b) => compareStartTitles(a.title, b.title));
      return inGroup.length === 0 ? [] : [{ label: group.label, items: inGroup }];
    },
  );
}

/**
 * 작업 공간 항목 하나를 검색 화면 항목으로 바꾼다.
 * @param item 폴더, 글, 외부 링크
 * @returns 검색 항목
 */
export function toSearchItem(item: PlacedItem): SearchItem {
  return { id: item.id, kind: item.kind, title: item.name };
}

/**
 * 고정됨 격자에서 화면 자리 아래에 있는 칸의 항목 id를 찾는다. 끌어 순서를 바꿀 때 놓일 자리를 정한다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param grid 고정 항목 칸을 담은 요소
 * @param x 화면 가로 자리(px)
 * @param y 화면 세로 자리(px)
 * @returns 그 자리의 칸의 항목 id. 칸 위가 아니면 null
 */
export function findPinnedIdAt(grid: Element | null, x: number, y: number): string | null {
  const tiles = grid?.querySelectorAll(`[${START_TILE_ID_ATTRIBUTE}]`) ?? [];
  for (const tile of tiles) {
    const rect = tile.getBoundingClientRect();
    if (x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom) {
      return tile.getAttribute(START_TILE_ID_ATTRIBUTE);
    }
  }
  return null;
}
