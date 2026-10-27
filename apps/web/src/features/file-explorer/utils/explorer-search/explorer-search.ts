// 탐색기 폴더 안 검색의 범위와 결과 차례, 위치 열 글자를 React 밖의 순수 함수로 모은다.

import type { ExplorerWorkspace } from '@/features/file-explorer/utils/explorer-location/explorer-location';
import { getMatchRank, type MatchRank } from '@/features/file-explorer/utils/name-match/name-match';
import { compareItemKinds, compareItemNames } from '@/shared/utils/item-sort/item-sort';
import {
  DESKTOP_NAME,
  getFolderPath,
  type PlacedItem,
  RECYCLE_BIN_ID,
  RECYCLE_BIN_NAME,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 일치 단계를 붙인 항목 */
type RankedItem = {
  /** 항목 */
  item: PlacedItem;
  /** 일치 단계 */
  rank: MatchRank;
};

// 위치 열에서 위치 이름을 잇는 글자(Windows 경로 구분자).
const LOCATION_SEPARATOR = '\\';

/**
 * 현재 위치와 그 하위 폴더 전체에서 이름이 검색어와 맞는 항목을 찾는다. 휴지통에서는 휴지통에 보낸 항목과 그 안의 항목에서 찾는다.
 * 차례는 일치 단계(이름 전체가 같음 → 검색어로 시작 → 중간에 포함)이고, 같은 단계 안에서는 폴더·글·외부 링크 차례로 두어
 * 글은 최신순, 폴더와 외부 링크는 이름순이다.
 * @codocs [[파일 탐색기:폴더 안 검색]]
 * @codocs [[검색:일치 규칙]]
 * @param workspace 작업 공간
 * @param location 현재 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 * @param query 검색어
 * @returns 맞는 항목
 */
export function searchItems(
  workspace: ExplorerWorkspace,
  location: string | null,
  query: string,
): PlacedItem[] {
  const matches = getItemsUnder(workspace, location).flatMap((item) => {
    const rank = getMatchRank(item.name, query);
    return rank === null ? [] : [{ item, rank }];
  });
  return matches.sort(compareMatches).map((match) => match.item);
}

/**
 * 위치 열 글자. 항목이 놓인 위치를 바탕 화면(휴지통 안이면 휴지통)부터 `\`로 잇는다(예: `바탕 화면\Blog\React`).
 * @codocs [[파일 탐색기:폴더 안 검색]]
 * @param workspace 작업 공간
 * @param parentId 항목이 놓인 위치
 * @returns 위치 글자
 */
export function getItemLocationLabel(
  workspace: ExplorerWorkspace,
  parentId: string | null,
): string {
  if (parentId === null) {
    return DESKTOP_NAME;
  }
  if (parentId === RECYCLE_BIN_ID) {
    return RECYCLE_BIN_NAME;
  }
  const folders = getFolderPath(workspace, parentId);
  const root = folders[0]?.parentId === RECYCLE_BIN_ID ? RECYCLE_BIN_NAME : DESKTOP_NAME;
  return [root, ...folders.map((folder) => folder.name)].join(LOCATION_SEPARATOR);
}

/**
 * 위치 아래의 모든 항목(하위 폴더 안까지)을 돌려준다. 바탕화면에서는 휴지통 안을 뺀다.
 * @param workspace 작업 공간
 * @param location 위치
 * @returns 항목
 */
function getItemsUnder(workspace: ExplorerWorkspace, location: string | null): PlacedItem[] {
  const items = Object.values(workspace.items).filter(
    (item): item is PlacedItem => item.kind !== 'recycle-bin',
  );
  const result: PlacedItem[] = [];
  const queue: (string | null)[] = [location];
  const visited = new Set<string | null>(queue);
  while (queue.length > 0) {
    const parentId = queue.shift() ?? null;
    for (const item of items) {
      if (item.parentId === parentId && !visited.has(item.id)) {
        visited.add(item.id);
        result.push(item);
        queue.push(item.id);
      }
    }
  }
  return result;
}

/**
 * 두 검색 결과의 차례를 비교한다.
 * @param a 결과
 * @param b 결과
 * @returns 비교 값
 */
function compareMatches(a: RankedItem, b: RankedItem): number {
  const byKind = compareItemKinds(a.item.kind, b.item.kind);
  if (a.rank !== b.rank || byKind !== 0) {
    return a.rank - b.rank || byKind;
  }
  if (a.item.kind === 'post' && b.item.kind === 'post') {
    return b.item.date.localeCompare(a.item.date) || compareItemNames(a.item.name, b.item.name);
  }
  return compareItemNames(a.item.name, b.item.name);
}
