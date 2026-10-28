import type { ComponentSummary, MotionSummary } from '../messages';

// 플러그인 화면 대상 목록의 묶음, 고른 수, 열릴 PR 수, 목록 안 찾기를 정하는 순수 계산이다. DOM을 모른다.

/** 토큰 줄의 선택 키 */
export const TOKENS_KEY = 'tokens';

/** 목록에 보이는 대상 종류(토큰은 따로 한 줄이다) */
export type ItemKind = 'component' | 'pattern' | 'motion';

/** 목록 항목 하나 */
export type CatalogItem = {
  /** 선택 키(`<종류>:<노드 ID>`) */
  key: string;
  id: string;
  kind: ItemKind;
  name: string;
  /** 묶음 키 */
  groupKey: string;
  /** 변형 수. 애니메이션은 null */
  variantCount: number | null;
};

/** 묶음 하나. 컴포넌트는 영역 섹션, 조립은 영역(PR 하나), 애니메이션은 하나 */
export type CatalogGroup = {
  key: string;
  kind: ItemKind;
  title: string;
  items: CatalogItem[];
};

/** 대상 목록 */
export type Catalog = { groups: CatalogGroup[]; items: CatalogItem[] };

/** 묶음의 고른 상태 */
export type GroupSelection = { selected: number; total: number; state: 'none' | 'some' | 'all' };

/**
 * 본체가 보낸 목록으로 묶음을 만든다. 본체가 캔버스 순서로 보내므로 순서를 바꾸지 않고, 묶음은 처음 나온 순서다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param components 컴포넌트(캔버스 순서)
 * @param patterns 조립(캔버스 순서)
 * @param motions 애니메이션 견본
 * @returns 대상 목록
 */
export function buildCatalog(
  components: readonly ComponentSummary[],
  patterns: readonly ComponentSummary[],
  motions: readonly MotionSummary[],
): Catalog {
  const groups: CatalogGroup[] = [];
  const items: CatalogItem[] = [];
  /**
   * 항목을 그 묶음에 더한다. 묶음이 없으면 만든다.
   * @param item 항목
   * @param title 묶음 이름
   */
  function add(item: CatalogItem, title: string): void {
    let group = groups.find((candidate) => candidate.key === item.groupKey);
    if (group === undefined) {
      group = { key: item.groupKey, kind: item.kind, title, items: [] };
      groups.push(group);
    }
    group.items.push(item);
    items.push(item);
  }
  for (const [kind, list] of [
    ['component', components],
    ['pattern', patterns],
  ] as const) {
    for (const summary of list) {
      add(
        {
          key: `${kind}:${summary.id}`,
          id: summary.id,
          kind,
          name: summary.name,
          groupKey: `${kind}:${summary.group}`,
          variantCount: summary.variantCount,
        },
        summary.group,
      );
    }
  }
  for (const motion of motions) {
    add(
      {
        key: `motion:${motion.id}`,
        id: motion.id,
        kind: 'motion',
        name: motion.name,
        groupKey: 'motion',
        variantCount: null,
      },
      '견본',
    );
  }
  return { groups, items };
}

/**
 * 묶음에서 고른 수와 체크박스 상태(일부만 고르면 반쯤 찬 표시)를 구한다.
 * @codocs [[피그마 연동:플러그인 화면]]
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
 * 고른 대상으로 열리거나 갱신될 PR 수를 짐작한다. 컴포넌트·애니메이션은 하나마다, 조립은 영역마다 하나다.
 * 토큰은 `main`과 다르면 다른 대상을 내보낼 때도 토큰 PR이 생기므로 하나 더한다. 비교 전이면 토큰을 골랐을 때만 센다.
 * @codocs [[피그마 연동:플러그인 화면]]
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
  const chosen = catalog.items.filter((item) => selected.has(item.key));
  const areas = new Set(
    chosen.filter((item) => item.kind === 'pattern').map((item) => item.groupKey),
  );
  const others = chosen.filter((item) => item.kind !== 'pattern').length;
  const isExporting = chosen.length > 0 || selected.has(TOKENS_KEY);
  let tokens = 0;
  if (hasTokenChanges === null) {
    tokens = selected.has(TOKENS_KEY) ? 1 : 0;
  } else if (hasTokenChanges && isExporting) {
    tokens = 1;
  }
  return others + areas.size + tokens;
}

/**
 * 목록 안 찾기에 걸리는 항목을 고른다. 이름에 글자가 든 항목만 남기고, 대소문자는 구분하지 않는다.
 * @codocs [[피그마 연동:플러그인 화면]]
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
