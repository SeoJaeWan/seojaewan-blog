import { type CodocsDoc, splitDocLink } from './doc-sections.ts';
import type {
  BehaviorTable,
  CaseInfo,
  CaseResult,
  Cell,
  CodeRef,
  DocRef,
  DocSection,
  ReportOptions,
  ResultStatus,
  RowGroup,
  RunSummary,
  TableData,
  TableRow,
} from './table-types.ts';

/** 조건 → 값. 기준에서 바꾼 것만 적는다. */
type Change = Readonly<Record<string, string | undefined>>;

/** 표를 만드는 데 쓰는 케이스 정의. line: 정의 파일에서 케이스가 시작하는 줄. */
export type CaseSource = {
  id: string;
  change?: Change;
  combine?: { change: Change; reason: string };
  scenario: string;
  result: string;
  expected: readonly string[];
  docs: readonly string[];
  device?: string;
  line?: number | null;
};

/** 표를 만드는 데 쓰는 행위 정의. file: 저장소 기준 정의 파일 경로. */
export type BehaviorSource = {
  id: string;
  file: string;
  name: string;
  area: string;
  summary: string;
  conditions: Readonly<Record<string, { label: string; values: readonly string[]; base: string }>>;
  requires?: readonly { when: Change; then: Change }[];
  noCase?: Readonly<
    Record<
      string,
      Readonly<Record<string, { reason: string; docs: readonly string[] } | undefined>> | undefined
    >
  >;
  cases: readonly CaseSource[];
};

/** 실행 기록 한 번(보고서의 `history.json`). 결과는 케이스 열쇠(`행위id/케이스id`)로 찾는다. */
export type HistoryRun = RunSummary & { results: Record<string, ResultStatus> };

/** 표를 만들 때 함께 쓰는 근거와 결과. results: `[행위id#번호]` → 결과. 보고서에서만 준다. */
export type TableInputs = {
  docs: ReadonlyMap<string, CodocsDoc>;
  code: ReadonlyMap<string, CodeRef[]>;
  results?: ReadonlyMap<string, CaseResult>;
  mode: TableData['mode'];
  run?: TableData['run'];
  report?: ReportOptions;
  repoUrl: string;
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
 * @param docs 문서
 * @returns 문서·섹션 이름과 찾았는지
 */
function resolveDoc(link: string, docs: TableInputs['docs']): DocRef {
  const { doc, section } = splitDocLink(link);
  const isFound = section !== '' && docs.get(doc)?.sections.has(section) === true;
  return { link, doc, section, isFound };
}

/**
 * 문서 섹션과 그 섹션을 구현한 코드를 모은다.
 * @param link `[[문서:섹션]]`
 * @param inputs 문서와 코드 근거
 * @returns 섹션
 */
function sectionOf(link: string, inputs: TableInputs): DocSection {
  const { doc, section } = splitDocLink(link);
  return {
    link,
    doc,
    section,
    path: inputs.docs.get(doc)?.path ?? null,
    code: inputs.code.get(link) ?? [],
  };
}

/** 의존을 따라 값을 채운 결과. `required`는 의존이 채운 조건 키다. */
type Resolved = { values: Record<string, string>; required: Set<string> };

/**
 * 기준값에 바꾼 값을 얹고, 조건 사이의 의존(`requires`)을 더 바뀌지 않을 때까지 따라 채운다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 정의
 * @param changes 차례로 얹을 바꾼 값
 * @returns 조건마다의 값과 의존이 채운 조건
 */
export function resolveValues(
  behavior: Pick<BehaviorSource, 'conditions' | 'requires'>,
  ...changes: Change[]
): Resolved {
  const values: Record<string, string> = Object.fromEntries(
    Object.entries(behavior.conditions).map(([key, condition]) => [key, condition.base]),
  );
  const set = new Set<string>();
  for (const change of changes) {
    for (const [key, value] of Object.entries(change)) {
      if (value !== undefined) {
        values[key] = value;
        set.add(key);
      }
    }
  }
  const required = new Set<string>();
  const limit = (behavior.requires?.length ?? 0) + 1;
  for (let round = 0; round < limit; round += 1) {
    let hasMoved = false;
    for (const requirement of behavior.requires ?? []) {
      const isMatched = Object.entries(requirement.when).every(
        ([key, value]) => values[key] === value,
      );
      if (!isMatched) {
        continue;
      }
      for (const [key, value] of Object.entries(requirement.then)) {
        if (value !== undefined && values[key] !== value && !set.has(key)) {
          values[key] = value;
          required.add(key);
          hasMoved = true;
        }
      }
    }
    if (!hasMoved) {
      break;
    }
  }
  return { values, required };
}

/**
 * 조건 값으로 표의 칸을 만든다.
 * @param behavior 행위 정의
 * @param values 조건마다의 값
 * @returns 조건 차례의 칸
 */
function cellsOf(behavior: BehaviorSource, values: Record<string, string>): Cell[] {
  return Object.entries(behavior.conditions).map(([key, condition]) => {
    const value = values[key] ?? condition.base;
    return { key, value, isChanged: value !== condition.base };
  });
}

/**
 * 결과가 통과인지 본다. 다시 해서 통과한 것도 통과다.
 * @param result 결과
 * @returns 통과면 true
 */
function isPassed(result: CaseResult | null): boolean {
  return result?.status === 'passed' || result?.status === 'flaky';
}

/**
 * 결과가 실패인지 본다.
 * @param result 결과
 * @returns 실패면 true
 */
function isFailed(result: CaseResult | null): boolean {
  return result !== null && !isPassed(result) && result.status !== 'skipped';
}

/**
 * 행위 하나를 표로 만든다. 기준 묶음과 조건마다 "○○ 다름" 묶음을 만들고, 값마다 케이스·이유·같은 케이스·빠짐 줄을 둔다.
 * 케이스는 기준에서 조건 하나(`change`)를 바꾸고, 의존(`requires`)이 채운 값과 엮은 값(`combine`)이 함께 진하게 보인다.
 * 의존이 채운 값은 따로 케이스가 없으면 그 케이스와 같은 케이스 줄이 된다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 정의
 * @param inputs 근거와 결과
 * @returns 행위 표
 */
export function buildBehaviorTable(behavior: BehaviorSource, inputs: TableInputs): BehaviorTable {
  const conditions = Object.entries(behavior.conditions);
  const problems: string[] = [];
  /**
   * 조건 키의 사람이 읽는 이름을 찾는다.
   * @param key 조건 키
   * @returns 조건 이름. 없으면 키
   */
  function label(key: string): string {
    return behavior.conditions[key]?.label ?? key;
  }

  /**
   * 바꾼 값이 조건에 있는지 본다.
   * @param change 바꾼 값
   * @param where 문제를 적을 때 붙일 위치
   */
  function checkChange(change: Change, where: string): void {
    for (const [key, value] of Object.entries(change)) {
      const condition = behavior.conditions[key];
      if (condition === undefined) {
        problems.push(`${where}: 없는 조건 ${key}`);
      } else if (value !== undefined && !condition.values.includes(value)) {
        problems.push(`${where}: ${condition.label}에 없는 값 '${value}'`);
      } else if (value === condition.base) {
        problems.push(`${where}: ${condition.label}을 기준값과 같은 값으로 바꿨다`);
      }
    }
  }

  for (const [index, requirement] of (behavior.requires ?? []).entries()) {
    if (Object.keys(requirement.when).length !== 1) {
      problems.push(`의존 ${index + 1}: when에는 조건 하나만 적는다`);
    }
    checkChange(requirement.when, `의존 ${index + 1}`);
    checkChange(requirement.then, `의존 ${index + 1}`);
  }
  const base = resolveValues(behavior);
  if (base.required.size > 0) {
    problems.push(`기준값이 의존과 맞지 않는다: ${[...base.required].map(label).join(', ')}`);
  }

  const primaryOf = new Map<number, string>();
  /** 의존이 채운 값 → 그 값을 다루는 첫 케이스 번호 */
  const coveredBy = new Map<string, number>();
  const rowOf = new Map<number, TableRow>();
  const cases: CaseInfo[] = behavior.cases.map(
    /**
     * 케이스 하나를 검사하고, 표의 케이스 줄과 근거 펼침에 쓸 정보를 만든다.
     * @param source 케이스 정의
     * @param index 0부터 센 차례
     * @returns 케이스 정보
     */
    (source, index) => {
      const number = index + 1;
      const where = `${number}번 케이스`;
      const change = source.change ?? {};
      const keys = Object.keys(change);
      if (number === 1 && keys.length > 0) {
        problems.push(`${where}: 1번 케이스는 기준이라 바꾼 조건이 없어야 한다`);
      }
      if (number > 1 && keys.length !== 1) {
        problems.push(`${where}: 기준에서 조건 하나만 바꾼다(지금 ${keys.length}개)`);
      }
      checkChange(change, where);
      if (source.combine !== undefined) {
        checkChange(source.combine.change, `${where} combine`);
        for (const key of Object.keys(source.combine.change)) {
          if (key in change) {
            problems.push(`${where}: combine이 바꾼 조건과 겹친다(${label(key)})`);
          }
        }
        if (source.combine.reason.trim() === '') {
          problems.push(`${where}: combine의 이유가 없다`);
        }
      }
      if (source.result.trim() === '') {
        problems.push(`${where}: 결과(result)가 없다`);
      }
      const resolved = resolveValues(behavior, change, source.combine?.change ?? {});
      for (const key of resolved.required) {
        const id = `${key}\u0000${resolved.values[key] ?? ''}`;
        if (!coveredBy.has(id)) {
          coveredBy.set(id, number);
        }
      }
      if (keys[0] !== undefined) {
        primaryOf.set(number, keys[0]);
      }
      rowOf.set(number, {
        kind: 'case',
        cells: cellsOf(behavior, resolved.values),
        case: number,
        result: source.result,
        docs: [],
      });
      const docs = source.docs.map((link) => resolveDoc(link, inputs.docs));
      for (const doc of docs) {
        if (!doc.isFound) {
          problems.push(`${where}: 문서에 없는 링크 ${doc.link}`);
        }
      }
      const token = grepToken(behavior.id, number);
      return {
        number,
        id: source.id,
        key: `${behavior.id}/${source.id}`,
        grepToken: token,
        scenario: source.scenario,
        result: source.result,
        expected: [...source.expected],
        docs,
        combineReason: source.combine?.reason ?? null,
        device: source.device ?? null,
        line: source.line ?? null,
        outcome: inputs.results?.get(token) ?? null,
      };
    },
  );

  const counts = { values: 0, covered: 0, same: 0, reason: 0, missing: 0 };
  const firstRow = rowOf.get(1);
  const groups: RowGroup[] =
    firstRow === undefined ? [] : [{ key: null, label: '기준', rows: [firstRow] }];
  for (const [key, condition] of conditions) {
    counts.values += condition.values.length;
    counts.covered += 1;
    const rows: TableRow[] = [];
    for (const value of condition.values) {
      if (value === condition.base) {
        continue;
      }
      const numbers = cases
        .filter((info) => primaryOf.get(info.number) === key)
        .filter((info) => behavior.cases[info.number - 1]?.change?.[key] === value)
        .map((info) => info.number);
      const reason = behavior.noCase?.[key]?.[value];
      if (numbers.length > 0) {
        counts.covered += 1;
        if (reason !== undefined) {
          problems.push(
            `${condition.label} '${value}'은 케이스가 있는데 케이스가 없는 이유도 적었다`,
          );
        }
        for (const number of numbers) {
          const row = rowOf.get(number);
          if (row !== undefined) {
            rows.push(row);
          }
        }
        continue;
      }
      if (reason !== undefined) {
        counts.reason += 1;
        const docs = reason.docs.map((link) => resolveDoc(link, inputs.docs));
        for (const doc of docs) {
          if (!doc.isFound) {
            problems.push(`${condition.label} '${value}'의 이유: 문서에 없는 링크 ${doc.link}`);
          }
        }
        rows.push({
          kind: 'reason',
          cells: cellsOf(behavior, resolveValues(behavior, { [key]: value }).values),
          case: null,
          result: reason.reason,
          docs,
        });
        continue;
      }
      const same = coveredBy.get(`${key}\u0000${value}`);
      const sameRow = same === undefined ? undefined : rowOf.get(same);
      if (same !== undefined && sameRow !== undefined) {
        counts.covered += 1;
        counts.same += 1;
        const primary = primaryOf.get(same);
        const primaryValue =
          primary === undefined ? '' : behavior.cases[same - 1]?.change?.[primary];
        rows.push({
          kind: 'same',
          cells: sameRow.cells,
          case: same,
          result: `‘${primaryValue ?? ''}’ 줄과 같은 케이스`,
          docs: [],
        });
        continue;
      }
      counts.missing += 1;
      rows.push({
        kind: 'missing',
        cells: cellsOf(behavior, resolveValues(behavior, { [key]: value }).values),
        case: null,
        result: '',
        docs: [],
      });
    }
    if (rows.length > 0) {
      groups.push({ key, label: `${condition.label} 다름`, rows });
    }
  }
  for (const [key, values] of Object.entries(behavior.noCase ?? {})) {
    const condition = behavior.conditions[key];
    for (const value of Object.keys(values ?? {})) {
      if (condition === undefined || !condition.values.includes(value)) {
        problems.push(`케이스가 없는 이유를 적은 값이 조건에 없다: ${key} '${value}'`);
      } else if (value === condition.base) {
        problems.push(`기준값에 케이스가 없는 이유를 적었다: ${condition.label} '${value}'`);
      }
    }
  }

  return {
    id: behavior.id,
    name: behavior.name,
    area: behavior.area,
    summary: behavior.summary,
    file: behavior.file,
    conditions: conditions.map(
      /**
       * 조건 하나를 화면에 넘길 모양으로 바꾼다.
       * @param entry 조건 키와 조건
       * @param entry."0" 조건 키
       * @param entry."1" 조건
       * @returns 조건 정보
       */
      ([key, condition]) => ({
        key,
        label: condition.label,
        base: condition.base,
        values: [...condition.values],
      }),
    ),
    cases,
    groups,
    problems,
    counts,
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
 * 실행 기록에서 케이스별 결과를 뺀 요약을 꺼낸다.
 * @param run 실행 기록 한 번
 * @returns 실행 요약
 */
export function runSummaryOf(run: RunSummary): RunSummary {
  return {
    commit: run.commit,
    url: run.url,
    time: run.time,
    durationMs: run.durationMs,
    passed: run.passed,
    failed: run.failed,
  };
}

/**
 * 행위 정의 전체를 화면 데이터로 만든다. 영역 차례, 합계, 근거 섹션을 함께 낸다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behaviors 행위 정의
 * @param inputs 근거와 결과
 * @returns 화면 데이터
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
  const links = new Set<string>();
  for (const table of tables) {
    for (const info of table.cases) {
      for (const doc of info.docs) {
        links.add(doc.link);
      }
    }
  }
  const allCases = tables.flatMap((table) => table.cases);
  /**
   * 행위 표 전체에서 개수 하나를 더한다.
   * @param pick 행위 표에서 셀 개수
   * @returns 합계
   */
  function sum(pick: (table: BehaviorTable) => number): number {
    return tables.reduce((total, table) => total + pick(table), 0);
  }
  return {
    generatedAt: inputs.generatedAt,
    mode: inputs.mode,
    repoUrl: inputs.repoUrl,
    areas: [...new Set(tables.map((table) => table.area))],
    behaviors: tables,
    sections: Object.fromEntries([...links].sort().map((link) => [link, sectionOf(link, inputs)])),
    totals: {
      behaviors: tables.length,
      cases: allCases.length,
      passed: allCases.filter((info) => isPassed(info.outcome)).length,
      failed: allCases.filter((info) => isFailed(info.outcome)).length,
      values: sum((table) => table.counts.values),
      covered: sum((table) => table.counts.covered),
      same: sum((table) => table.counts.same),
      reason: sum((table) => table.counts.reason),
      missing: sum((table) => table.counts.missing),
    },
    run: inputs.run ?? null,
    report: inputs.report ?? null,
  };
}
