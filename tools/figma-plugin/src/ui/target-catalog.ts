import type { ComponentSummary } from '../messages';

// 플러그인 화면 대상 목록의 묶음, 고른 수, 열릴 PR 수, 목록 안 찾기를 정하는 순수 계산이다. DOM을 모른다.

/** 토큰 줄의 선택 키 */
export const TOKENS_KEY = 'tokens';
/** 자산 줄의 선택 키 */
export const ASSETS_KEY = 'assets';

/**
 * 컴포넌트 항목 하나.
 * - key: 선택 키(`component:<노드 ID>`)
 * - groupKey: 묶음(페이지) 키
 * - variantCount: 변형 수
 */
export type CatalogItem = {
  key: string;
  id: string;
  name: string;
  groupKey: string;
  variantCount: number;
};

/** 묶음 하나. 컴포넌트를 놓인 페이지(Controls·Shell·Blog)로 묶는다 */
export type CatalogGroup = {
  key: string;
  title: string;
  items: CatalogItem[];
};

/** 대상 목록 */
export type Catalog = { groups: CatalogGroup[]; items: CatalogItem[] };

/** 묶음의 고른 상태 */
export type GroupSelection = { selected: number; total: number; state: 'none' | 'some' | 'all' };

/**
 * 본체가 보낸 목록으로 묶음을 만든다. 본체가 페이지 순서, 페이지 안은 캔버스 순서로 보내므로 순서를 바꾸지 않는다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @param components 컴포넌트(페이지 순서, 캔버스 순서)
 * @returns 대상 목록
 */
export function buildCatalog(components: readonly ComponentSummary[]): Catalog {
  const groups: CatalogGroup[] = [];
  const items: CatalogItem[] = [];
  for (const summary of components) {
    const groupKey = `page:${summary.page}`;
    let group = groups.find((candidate) => candidate.key === groupKey);
    if (group === undefined) {
      group = { key: groupKey, title: summary.page, items: [] };
      groups.push(group);
    }
    const item: CatalogItem = {
      key: `component:${summary.id}`,
      id: summary.id,
      name: summary.name,
      groupKey,
      variantCount: summary.variantCount,
    };
    group.items.push(item);
    items.push(item);
  }
  return { groups, items };
}

/**
 * 묶음에서 고른 수와 체크박스 상태(일부만 고르면 반쯤 찬 표시)를 구한다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @param items 묶음 항목(보이는 항목만 넘길 수도 있다)
 * @param selected 고른 키
 * @returns 고른 수, 전체 수, 상태
 */
export function groupSelection(
  items: readonly CatalogItem[],
  selected: ReadonlySet<string>,
): GroupSelection {
  const count = items.filter((item) => selected.has(item.key)).length;
  let state: GroupSelection['state'] = 'some';
  if (count === 0) {
    state = 'none';
  } else if (count === items.length) {
    state = 'all';
  }
  return { selected: count, total: items.length, state };
}

/**
 * 고른 대상으로 열리거나 갱신될 PR 수를 짐작한다. 컴포넌트는 하나마다, 자산은 하나다.
 * 토큰은 `main`과 다르면 다른 대상을 내보낼 때도 토큰 PR이 생기므로 하나 더한다. 비교 전이면 토큰을 골랐을 때만 센다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @param catalog 대상 목록
 * @param selected 고른 키
 * @param hasTokenChanges 토큰이 `main`과 다른지. 모르면 null
 * @returns PR 수
 */
export function estimatePullRequests(
  catalog: Catalog,
  selected: ReadonlySet<string>,
  hasTokenChanges: boolean | null,
): number {
  const components = catalog.items.filter((item) => selected.has(item.key)).length;
  const assets = selected.has(ASSETS_KEY) ? 1 : 0;
  const isExporting = components + assets > 0 || selected.has(TOKENS_KEY);
  let tokens = 0;
  if (hasTokenChanges === null) {
    tokens = selected.has(TOKENS_KEY) ? 1 : 0;
  } else if (hasTokenChanges && isExporting) {
    tokens = 1;
  }
  return components + assets + tokens;
}

/**
 * 목록 안 찾기에 걸리는 항목을 고른다. 이름에 글자가 든 항목만 남기고, 대소문자는 구분하지 않는다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @param items 항목
 * @param query 찾을 글자. 비면 모두
 * @returns 걸린 항목
 */
export function filterItems(items: readonly CatalogItem[], query: string): CatalogItem[] {
  const needle = query.trim().toLowerCase();
  return needle === ''
    ? [...items]
    : items.filter((item) => item.name.toLowerCase().includes(needle));
}
