import { type CodocsDoc, firstLineOf, splitDocLink } from './doc-sections.ts';
import { suggestMissing } from './suggest.ts';
import type {
  AreaSummary,
  BehaviorTable,
  CaseResult,
  CaseRow,
  CodeRef,
  CommonMissing,
  ConditionColumn,
  DocRef,
  DocSection,
  ResultStatus,
  RunSummary,
  TableData,
} from './table-types.ts';

/** 표를 만드는 데 쓰는 케이스 정의. */
export type CaseSource = {
  id: string;
  change?: Readonly<Record<string, string | undefined>>;
  scenario: string;
  expected: readonly string[];
  docs: readonly string[];
  device?: string;
  /** 정의 파일에서 케이스가 시작하는 줄 */
  line?: number | null;
  /** 실행 함수 코드 */
  source?: string;
};

/** 표를 만드는 데 쓰는 행위 정의. */
export type BehaviorSource = {
  id: string;
  /** 저장소 기준 정의 파일 경로 */
  file: string;
  name: string;
  area: string;
  conditions: Readonly<Record<string, { label: string; values: readonly string[]; base: string }>>;
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

/** 표를 만들 때 함께 쓰는 근거와 결과. */
export type TableInputs = {
  docs: ReadonlyMap<string, CodocsDoc>;
  code: ReadonlyMap<string, CodeRef[]>;
  /** `[행위id#번호]` → 결과. 보고서에서만 준다 */
  results?: ReadonlyMap<string, CaseResult>;
  /** 최근 실행 기록(새것부터). 마지막 실행을 포함한다 */
  history?: readonly HistoryRun[];
  /** 이번 PR에서 바뀐 파일 */
  changes?: TableData['changes'];
  mode: TableData['mode'];
  run?: TableData['run'];
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

/** 케이스 결과 아래에 두는 최근 실행 수 */
const HISTORY_SIZE = 5;
/** 정의 폴더의 도우미 파일(정의 파일이 아닌 것). 바뀌면 모든 케이스가 영향받는다 */
const BEHAVIOR_HELPER =
  /^apps\/web\/e2e\/(?:behaviors\/(?!.*\.behavior\.ts$).+|behaviors\.test\.ts)$/u;

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
 * @returns 섹션 첫 줄과 찾았는지
 */
function resolveDoc(link: string, docs: TableInputs['docs']): DocRef {
  const { doc, section } = splitDocLink(link);
  const body = section === '' ? undefined : docs.get(doc)?.sections.get(section);
  return {
    link,
    doc,
    section,
    found: body !== undefined,
    firstLine: body === undefined ? '' : firstLineOf(body),
  };
}

/**
 * 문서 섹션을 옆 패널에 보일 모양으로 만든다.
 * @param link `[[문서:섹션]]`
 * @param inputs 문서와 코드 근거
 * @returns 섹션 본문과 연결된 코드
 */
function sectionOf(link: string, inputs: TableInputs): DocSection {
  const { doc, section } = splitDocLink(link);
  const found = inputs.docs.get(doc);
  return {
    link,
    doc,
    section,
    path: found?.path ?? null,
    body: (found?.sections.get(section) ?? '').replace(/\\\[\[/gu, '[['),
    code: inputs.code.get(link) ?? [],
  };
}

/**
 * 케이스가 이번 PR에서 바뀐 파일의 영향을 받는지 본다. 정의 파일이나 정의 도우미가 바뀌었거나,
 * 근거 섹션의 문서 파일이나 그 섹션에 `@codocs`로 연결된 제품 코드가 바뀌면 영향받는다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 정의
 * @param links 케이스 근거 링크
 * @param inputs 문서·코드 근거와 바뀐 파일
 * @returns 영향받으면 true
 */
export function isAffected(
  behavior: Pick<BehaviorSource, 'file'>,
  links: readonly string[],
  inputs: Pick<TableInputs, 'changes' | 'docs' | 'code'>,
): boolean {
  const files = new Set(inputs.changes?.files ?? []);
  if (files.size === 0) {
    return false;
  }
  if (files.has(behavior.file) || [...files].some((file) => BEHAVIOR_HELPER.test(file))) {
    return true;
  }
  return links.some(
    /**
     * 근거 섹션의 문서 파일이나 연결된 제품 코드가 바뀌었는지 본다.
     * @param link 근거 링크
     * @returns 바뀌었으면 true
     */
    (link) => {
      const docPath = inputs.docs.get(splitDocLink(link).doc)?.path;
      if (docPath !== undefined && files.has(docPath)) {
        return true;
      }
      return (inputs.code.get(link) ?? []).some((ref) => files.has(ref.file));
    },
  );
}

/**
 * 행위 하나를 표로 만든다. 케이스 줄, 조건 × 값 지도(케이스 있음·이유 있음·빠짐), 빠진 값 제안을 만든다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param behavior 행위 정의
 * @param inputs 근거와 결과
 * @returns 행위 표
 */
export function buildBehaviorTable(behavior: BehaviorSource, inputs: TableInputs): BehaviorTable {
  const entries = Object.entries(behavior.conditions);
  const usedBy = new Map(
    entries.map(([key, condition]) => [
      key,
      new Map(condition.values.map((value) => [value, [] as number[]])),
    ]),
  );
  const history = inputs.history ?? [];

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
      if (source.scenario.trim() === '') {
        problems.push('근거 없음: 시나리오가 없다');
      }
      if (source.expected.length === 0) {
        problems.push('근거 없음: 기대 결과가 없다');
      }
      if (source.docs.length === 0) {
        problems.push('근거 없음: 문서 링크가 없다');
      }
      if (number > 1 && Object.keys(change).length === 0) {
        problems.push('기준에서 바꾼 조건이 없다');
      }
      const cells = entries.map(
        /**
         * 조건 하나의 칸을 만들고 그 값을 이 케이스가 쓴 값으로 센다.
         * @param entry 조건 키와 조건
         * @returns 칸
         */
        (entry) => {
          const [key, condition] = entry;
          const value = change[key] ?? condition.base;
          if (!condition.values.includes(value)) {
            problems.push(`${condition.label}에 없는 값: ${value}`);
          }
          if (change[key] !== undefined && value === condition.base) {
            problems.push(`${condition.label}을 기준값과 같은 값으로 바꿨다`);
          }
          usedBy.get(key)?.get(value)?.push(number);
          return { key, value, changed: value !== condition.base };
        },
      );
      for (const key of Object.keys(change)) {
        if (!(key in behavior.conditions)) {
          problems.push(`없는 조건: ${key}`);
        }
      }
      const docs = source.docs.map((link) => resolveDoc(link, inputs.docs));
      for (const doc of docs) {
        if (!doc.found) {
          problems.push(`문서에 없는 링크: ${doc.link}`);
        }
      }
      const token = grepToken(behavior.id, number);
      const key = `${behavior.id}/${source.id}`;
      return {
        number,
        id: source.id,
        key,
        grepToken: token,
        scenario: source.scenario,
        expected: [...source.expected],
        cells,
        changedKeys: cells.filter((cell) => cell.changed).map((cell) => cell.key),
        docs,
        device: source.device ?? null,
        line: source.line ?? null,
        source: source.source ?? '',
        problems,
        result: inputs.results?.get(token) ?? null,
        history: history
          .slice(0, HISTORY_SIZE)
          .map((run) => run.results[key])
          .filter((status) => status !== undefined)
          .reverse(),
        affected: isAffected(behavior, source.docs, inputs),
      };
    },
  );

  const problems: string[] = [];
  const bodies = new Map(
    [...new Set(behavior.cases.flatMap((source) => source.docs))].map((link) => [
      link,
      sectionOf(link, inputs).body,
    ]),
  );
  const baseScenario = behavior.cases[0]?.scenario ?? '';
  const counts = { values: 0, covered: 0, reason: 0, missing: 0 };
  const conditions: ConditionColumn[] = entries.map(
    /**
     * 조건 하나의 지도 줄을 만든다.
     * @param entry 조건 키와 조건
     * @returns 조건 줄
     */
    (entry) => conditionColumn(entry[0], entry[1]),
  );
  /**
   * 조건 하나의 지도 줄을 만든다. 값마다 케이스 있음·이유 있음·빠짐을 가르고 개수를 센다.
   * @param key 조건 키
   * @param condition 조건
   * @returns 조건 줄
   */
  function conditionColumn(
    key: string,
    condition: BehaviorSource['conditions'][string],
  ): ConditionColumn {
    return {
      key,
      label: condition.label,
      base: condition.base,
      values: condition.values.map(
        /**
         * 값 하나의 칸을 만든다.
         * @param value 조건 값
         * @returns 칸
         */
        (value) => {
          const numbers = usedBy.get(key)?.get(value) ?? [];
          const reason = behavior.noCase?.[key]?.[value];
          counts.values += 1;
          if (reason !== undefined && numbers.length > 0) {
            problems.push(
              `${condition.label} '${value}'은 케이스가 있는데 케이스가 없는 이유도 적었다`,
            );
          }
          if (numbers.length > 0) {
            counts.covered += 1;
            return { value, cases: numbers, state: 'case', noCase: null, suggestion: null };
          }
          if (reason !== undefined) {
            counts.reason += 1;
            const docs = reason.docs.map((link) => resolveDoc(link, inputs.docs));
            for (const doc of docs) {
              if (!doc.found) {
                problems.push(`문서에 없는 링크: ${doc.link}`);
              }
            }
            return {
              value,
              cases: [],
              state: 'reason',
              noCase: { reason: reason.reason, docs },
              suggestion: null,
            };
          }
          counts.missing += 1;
          return {
            value,
            cases: [],
            state: 'missing',
            noCase: null,
            suggestion: suggestMissing({
              key,
              label: condition.label,
              value,
              baseScenario,
              bodies,
            }),
          };
        },
      ),
    };
  }
  for (const [key, values] of Object.entries(behavior.noCase ?? {})) {
    const condition = behavior.conditions[key];
    for (const value of Object.keys(values ?? {})) {
      if (condition === undefined || !condition.values.includes(value)) {
        problems.push(`케이스가 없는 이유를 적은 값이 조건에 없다: ${key} '${value}'`);
      }
    }
  }

  return {
    id: behavior.id,
    name: behavior.name,
    area: behavior.area,
    file: behavior.file,
    conditions,
    cases,
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
 * 행위 정의 전체를 화면 데이터로 만든다. 영역별 합계, 여러 행위에서 함께 빠진 값, 근거 섹션을 함께 낸다.
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
  const areas: AreaSummary[] = [];
  for (const table of tables) {
    let summary = areas.find((area) => area.area === table.area);
    if (summary === undefined) {
      summary = { area: table.area, behaviors: 0, cases: 0, missing: 0, passed: 0, failed: 0 };
      areas.push(summary);
    }
    summary.behaviors += 1;
    summary.cases += table.cases.length;
    summary.missing += table.counts.missing;
    summary.passed += table.cases.filter((row) => isPassed(row.result)).length;
    summary.failed += table.cases.filter((row) => isFailed(row.result)).length;
  }

  const common = new Map<string, CommonMissing>();
  for (const table of tables) {
    for (const condition of table.conditions) {
      for (const cell of condition.values) {
        if (cell.state !== 'missing') {
          continue;
        }
        const key = `${condition.label}\u0000${cell.value}`;
        const entry = common.get(key) ?? {
          label: condition.label,
          value: cell.value,
          behaviors: [],
        };
        entry.behaviors.push(table.id);
        common.set(key, entry);
      }
    }
  }

  const links = new Set<string>();
  for (const table of tables) {
    for (const row of table.cases) {
      for (const doc of row.docs) {
        links.add(doc.link);
      }
    }
    for (const condition of table.conditions) {
      for (const cell of condition.values) {
        for (const doc of cell.noCase?.docs ?? []) {
          links.add(doc.link);
        }
        if (cell.suggestion?.rule) {
          links.add(cell.suggestion.rule.link);
        }
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
    areas,
    behaviors: tables,
    sections: Object.fromEntries([...links].sort().map((link) => [link, sectionOf(link, inputs)])),
    commonMissing: [...common.values()]
      .filter((entry) => entry.behaviors.length > 1)
      .sort((a, b) => b.behaviors.length - a.behaviors.length || a.label.localeCompare(b.label)),
    totals: {
      behaviors: tables.length,
      cases: allCases.length,
      passed: allCases.filter((row) => isPassed(row.result)).length,
      failed: allCases.filter((row) => isFailed(row.result)).length,
      values: sum((table) => table.counts.values),
      covered: sum((table) => table.counts.covered),
      reason: sum((table) => table.counts.reason),
      missing: sum((table) => table.counts.missing),
    },
    run: inputs.run ?? null,
    runs: (inputs.history ?? []).map(runSummaryOf),
    changes: inputs.changes ?? null,
  };
}
