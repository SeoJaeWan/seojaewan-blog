import { type CodocsDoc, firstLineOf, splitDocLink } from './doc-sections.ts';
import type {
  AreaSummary,
  BehaviorTable,
  CaseResult,
  CaseRow,
  CodeRef,
  DocRef,
  MissingRow,
  TableData,
} from './table-types.ts';

/** 표를 만드는 데 쓰는 행위 정의(실행 함수는 쓰지 않는다). */
export type BehaviorSource = {
  id: string;
  /** 저장소 기준 정의 파일 경로 */
  file: string;
  name: string;
  area: string;
  conditions: Readonly<Record<string, { label: string; values: readonly string[]; base: string }>>;
  cases: readonly {
    id: string;
    change?: Readonly<Record<string, string | undefined>>;
    purpose: string;
    docs: readonly string[];
    device?: string;
  }[];
};

/** 표를 만들 때 함께 쓰는 근거와 결과. */
export type TableInputs = {
  docs: ReadonlyMap<string, CodocsDoc>;
  code: ReadonlyMap<string, CodeRef[]>;
  /** `[행위id#번호]` → 결과. 결과 페이지에서만 준다 */
  results?: ReadonlyMap<string, CaseResult>;
  mode: TableData['mode'];
  run?: TableData['run'];
  generatedAt: string;
};

/** 영역을 늘어놓는 차례. 목록에 없는 영역은 뒤에 이름순으로 붙는다. */
export const areaOrder = [
  '바탕화면',
  '탐색기',
  'Start',
  '검색',
  '작업 표시줄',
  '창',
  'Chrome',
  '공통',
];

/**
 * 케이스 하나를 시험 제목에서 고르는 표시를 만든다(`apps/web/e2e/behaviors.test.ts`와 같다).
 * @param behaviorId 행위 id
 * @param number 케이스 번호(1부터)
 * @returns `[행위id#번호]`
 */
export function grepToken(behaviorId: string, number: number): string {
  return `[${behaviorId}#${number}]`;
}

/**
 * 문서 링크를 풀어 쓴다.
 * @param link `[[문서:섹션]]`
 * @param inputs 문서와 코드 근거
 * @returns 섹션 첫 줄과 그 섹션에 연결된 코드
 */
function resolveDoc(link: string, inputs: TableInputs): DocRef {
  const { doc, section } = splitDocLink(link);
  const found = inputs.docs.get(doc);
  const body = section === '' ? undefined : found?.sections.get(section);
  return {
    link,
    doc,
    section,
    found: body !== undefined,
    firstLine: body === undefined ? '' : firstLineOf(body),
    path: found?.path ?? null,
    code: inputs.code.get(link) ?? [],
  };
}

/**
 * 행위 하나를 표로 만든다. 기준과 다른 칸을 표시하고 빠진 값을 모은다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 정의
 * @param inputs 근거와 결과
 * @returns 행위 표
 */
export function buildBehaviorTable(behavior: BehaviorSource, inputs: TableInputs): BehaviorTable {
  const conditions: BehaviorTable['conditions'] = [];
  for (const [key, condition] of Object.entries(behavior.conditions)) {
    conditions.push({
      key,
      label: condition.label,
      values: [...condition.values],
      base: condition.base,
    });
  }
  const used = new Map(conditions.map((condition) => [condition.key, new Set([condition.base])]));

  const cases = behavior.cases.map(
    /**
     * 케이스 하나를 줄로 만든다.
     * @param source 케이스 정의
     * @param index 0부터 센 차례
     * @returns 케이스 줄
     */
    (source, index): CaseRow => {
      const number = index + 1;
      const change = source.change ?? {};
      const problems: string[] = [];
      if (source.purpose.trim() === '') {
        problems.push('근거 없음: 목적이 없다');
      }
      if (source.docs.length === 0) {
        problems.push('근거 없음: 문서 링크가 없다');
      }
      if (number > 1 && Object.keys(change).length === 0) {
        problems.push('기준에서 바꾼 조건이 없다');
      }
      const cells = conditions.map(
        /**
         * 조건 하나의 칸을 만들고 그 값을 쓴 값으로 센다.
         * @param condition 조건 열
         * @returns 칸
         */
        (condition) => {
          const value = change[condition.key] ?? condition.base;
          if (!condition.values.includes(value)) {
            problems.push(`${condition.label}에 없는 값: ${value}`);
          }
          if (change[condition.key] !== undefined && value === condition.base) {
            problems.push(`${condition.label}을 기준값과 같은 값으로 바꿨다`);
          }
          used.get(condition.key)?.add(value);
          return { key: condition.key, value, changed: value !== condition.base };
        },
      );
      for (const key of Object.keys(change)) {
        if (!(key in behavior.conditions)) {
          problems.push(`없는 조건: ${key}`);
        }
      }
      const docs = source.docs.map((link) => resolveDoc(link, inputs));
      for (const doc of docs) {
        if (!doc.found) {
          problems.push(`문서에 없는 링크: ${doc.link}`);
        }
      }
      const token = grepToken(behavior.id, number);
      return {
        number,
        id: source.id,
        grepToken: token,
        cells,
        changedCount: cells.filter((cell) => cell.changed).length,
        purpose: source.purpose,
        docs,
        device: source.device ?? null,
        problems,
        result: inputs.results?.get(token) ?? null,
      };
    },
  );

  const missing: MissingRow[] = conditions.flatMap((condition) =>
    condition.values
      .filter((value) => used.get(condition.key)?.has(value) !== true)
      .map((value) => ({ key: condition.key, label: condition.label, value })),
  );

  return {
    id: behavior.id,
    name: behavior.name,
    area: behavior.area,
    file: behavior.file,
    conditions,
    cases,
    missing,
  };
}

/**
 * 영역의 차례 값을 구한다.
 * @param area 영역 이름
 * @returns 작을수록 앞
 */
function areaRank(area: string): number {
  const rank = areaOrder.indexOf(area);
  return rank === -1 ? areaOrder.length : rank;
}

/**
 * 행위 정의 전체를 표 데이터로 만든다. 영역별 행위·케이스·빠진 값 합계를 함께 낸다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behaviors 행위 정의
 * @param inputs 근거와 결과
 * @returns 표 데이터
 */
export function buildTable(behaviors: readonly BehaviorSource[], inputs: TableInputs): TableData {
  const tables = behaviors
    .map((behavior) => buildBehaviorTable(behavior, inputs))
    .sort(
      (a, b) =>
        areaRank(a.area) - areaRank(b.area) ||
        a.area.localeCompare(b.area) ||
        a.id.localeCompare(b.id),
    );
  const areas: AreaSummary[] = [];
  for (const table of tables) {
    let summary = areas.find((area) => area.area === table.area);
    if (summary === undefined) {
      summary = { area: table.area, behaviors: 0, cases: 0, missing: 0 };
      areas.push(summary);
    }
    summary.behaviors += 1;
    summary.cases += table.cases.length;
    summary.missing += table.missing.length;
  }
  const allCases = tables.flatMap((table) => table.cases);
  return {
    generatedAt: inputs.generatedAt,
    mode: inputs.mode,
    areas,
    behaviors: tables,
    totals: {
      behaviors: tables.length,
      cases: allCases.length,
      missing: areas.reduce((sum, area) => sum + area.missing, 0),
      passed: allCases.filter(
        (row) => row.result?.status === 'passed' || row.result?.status === 'flaky',
      ).length,
      failed: allCases.filter(
        (row) =>
          row.result !== null && row.result.status !== 'passed' && row.result.status !== 'flaky',
      ).length,
    },
    run: inputs.run ?? null,
  };
}
