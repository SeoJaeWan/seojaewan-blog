// 검색 결과를 고르고 늘어놓는 규칙이다. 탐색기 폴더 안 검색과 Start·검색 패널의 검색이 함께 쓴다.

import { compareItemKinds, compareItemNames } from '@/shared/utils/item-sort/item-sort';
import { getMatchRank, type MatchRank } from '@/shared/utils/name-match/name-match';
import {
  isItemInTrash,
  type PlacedItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 일치 단계를 붙인 항목 */
type RankedItem = {
  /** 항목 */
  item: PlacedItem;
  /** 일치 단계 */
  rank: MatchRank;
};

/** 검색 결과를 종류별로 묶은 것. 맨 앞 최고 일치와 나머지다 */
export type SearchResultSet = {
  /** 맨 위에 크게 보이는 최고 일치 */
  bestMatch: PlacedItem;
  /** 나머지 폴더 결과 */
  folders: PlacedItem[];
  /** 나머지 글 결과 */
  posts: PlacedItem[];
  /** 나머지 외부 링크 결과 */
  links: PlacedItem[];
};

/**
 * 항목 가운데 이름이 검색어와 맞는 것을 일치 단계 차례로 돌려준다. 차례는 ① 이름 전체가 같음 → ② 검색어로 시작 → ③ 중간에 포함이고,
 * 같은 단계 안에서는 폴더·글·외부 링크 차례로 두어 글은 최신순, 폴더와 외부 링크는 이름순이다.
 * @codocs [[검색:일치 규칙]]
 * @param items 찾을 항목
 * @param query 검색어
 * @returns 맞는 항목
 */
export function rankItems(items: readonly PlacedItem[], query: string): PlacedItem[] {
  const matches = items.flatMap((item) => {
    const rank = getMatchRank(item.name, query);
    return rank === null ? [] : [{ item, rank }];
  });
  return matches.sort(compareMatches).map((match) => match.item);
}

/**
 * 작업 공간 전체에서 폴더, 글, 외부 링크를 이름으로 찾는다. 휴지통에 들어간 항목(안에 든 항목 포함)은 찾지 않는다.
 * @codocs [[검색:검색 대상]]
 * @codocs [[검색:일치 규칙]]
 * @param state 작업 공간 상태
 * @param query 검색어
 * @returns 맞는 항목. 일치 단계 차례다
 */
export function searchWorkspace(state: Pick<WorkspaceState, 'items'>, query: string): PlacedItem[] {
  const items = Object.values(state.items).filter(
    (item): item is PlacedItem => item.kind !== 'recycle-bin' && !isItemInTrash(state, item.id),
  );
  return rankItems(items, query);
}

/**
 * 검색 결과를 최고 일치 하나와, 나머지를 폴더 / 글 / 외부 링크로 묶은 것으로 나눈다.
 * @codocs [[검색:결과 화면]]
 * @param matches 일치 단계 차례의 검색 결과
 * @returns 묶은 결과. 결과가 없으면 null
 */
export function groupSearchResults(matches: readonly PlacedItem[]): SearchResultSet | null {
  const [bestMatch, ...rest] = matches;
  if (bestMatch === undefined) {
    return null;
  }
  return {
    bestMatch,
    folders: rest.filter((item) => item.kind === 'folder'),
    posts: rest.filter((item) => item.kind === 'post'),
    links: rest.filter((item) => item.kind === 'link'),
  };
}

/**
 * 결과 화면에 위에서 아래로 보이는 차례(최고 일치, 폴더, 글, 외부 링크)로 항목을 늘어놓는다. 방향키가 이 차례로 움직인다.
 * @codocs [[검색:결과 화면]]
 * @param results 묶은 결과
 * @returns 보이는 차례의 항목
 */
export function getSearchDisplayOrder(results: SearchResultSet): PlacedItem[] {
  return [results.bestMatch, ...results.folders, ...results.posts, ...results.links];
}

/**
 * 위·아래 방향키로 고른 항목을 옮긴다. 처음과 끝에서 멈춘다.
 * @codocs [[검색:결과 화면]]
 * @param index 지금 고른 차례
 * @param delta 옮길 칸 수(아래는 양수)
 * @param count 항목 개수
 * @returns 옮긴 차례
 */
export function moveSearchSelection(index: number, delta: number, count: number): number {
  return Math.min(Math.max(index + delta, 0), Math.max(count - 1, 0));
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
