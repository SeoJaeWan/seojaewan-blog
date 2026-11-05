// 시나리오 케이스 화면(로컬 도구와 GitHub Pages 보고서)이 읽는 데이터(JSON)의 모양.

/**
 * 코드 근거 한 곳. 케이스 문서 링크와 같은 `@codocs` 주석이 달린 제품 코드다.
 * - file: 저장소 기준 경로(`/`로 잇는다)
 * - line: 주석 다음 선언의 줄 번호(1부터)
 * - name: 선언 이름. 찾지 못하면 null
 * - description: 주석 설명의 첫 줄. 없으면 빈 문자열
 */
export type CodeRef = {
  file: string;
  line: number;
  name: string | null;
  description: string;
};

/**
 * 케이스·이유 문서 링크 하나를 풀어 쓴 것. 섹션은 `TableData.sections`에 있다.
 * - link: `[[문서:섹션]]` 그대로
 * - isFound: 그 문서와 섹션이 .codocs에 있는지
 */
export type DocRef = {
  link: string;
  doc: string;
  section: string;
  isFound: boolean;
};

/**
 * 문서 섹션 하나와 그 섹션을 구현한 코드.
 * - path: 문서 파일(저장소 기준). 없으면 null
 * - code: 이 링크와 같은 `@codocs` 주석이 달린 제품 코드
 */
export type DocSection = {
  link: string;
  doc: string;
  section: string;
  path: string | null;
  code: CodeRef[];
};

/** 줄의 조건 칸 하나. 기준과 다르면 `isChanged`다. */
export type Cell = { key: string; value: string; isChanged: boolean };

/** 결과 상태 */
export type ResultStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky';

/** 기대 결과 하나의 확인 결과. `unchecked`는 앞에서 실패해 확인하지 못한 것이다. */
export type CheckResult = { name: string; status: 'passed' | 'failed' | 'unchecked' };

/**
 * 실행 결과. CI 보고서에서 채운다.
 * - trace: 보고서 기준 trace zip 경로. 없으면 null
 * - error: 실패 메시지(색 코드를 지운 앞부분). 없으면 null
 * - checks: 기대 결과마다 확인 결과. 케이스의 `expected` 차례와 같다
 */
export type CaseResult = {
  status: ResultStatus;
  durationMs: number;
  trace: string | null;
  error: string | null;
  checks: CheckResult[];
};

/**
 * 케이스 하나. 표의 케이스 줄과 근거 펼침이 이것을 보인다.
 * - number: 정의 차례(1부터). 표의 번호다
 * - key: 실행 기록에서 케이스를 찾는 열쇠(`행위id/케이스id`)
 * - grepToken: Playwright 시험 제목 끝의 고르는 표시(`[행위id#번호]`)
 * - result: 결과 칸의 짧은 구
 * - combineReason: 일부러 엮은 조합의 이유. 없으면 null
 * - line: 정의 파일에서 케이스가 시작하는 줄(1부터). 찾지 못하면 null
 * - outcome: CI 결과. 로컬은 null
 */
export type CaseInfo = {
  number: number;
  id: string;
  key: string;
  grepToken: string;
  scenario: string;
  result: string;
  expected: string[];
  docs: DocRef[];
  combineReason: string | null;
  device: string | null;
  line: number | null;
  outcome: CaseResult | null;
};

/**
 * 표의 줄 하나.
 * `case`는 케이스 있음, `reason`은 케이스를 두지 않는 이유가 있음, `same`은 의존(`requires`)으로
 * 다른 케이스 줄이 이미 다루는 값, `missing`은 빠진 값이다.
 * - case: `case`는 그 케이스, `same`은 이 값을 다루는 케이스의 번호. 나머지는 null
 * - result: 결과 칸. 케이스 결과, 이유, 같은 케이스 안내. 빠진 값은 빈 문자열
 * - docs: 이유의 근거 문서. 이유 줄만
 */
export type TableRow = {
  kind: 'case' | 'reason' | 'same' | 'missing';
  cells: Cell[];
  case: number | null;
  result: string;
  docs: DocRef[];
};

/**
 * 표의 묶음. 기준(조건 null)과 조건마다 "○○ 다름".
 * - key: 바꾼 조건 키. 기준 묶음은 null
 * - label: 묶음 이름('기준' 또는 '○○ 다름')
 */
export type RowGroup = {
  key: string | null;
  label: string;
  rows: TableRow[];
};

export type ConditionInfo = { key: string; label: string; base: string; values: string[] };

/**
 * 행위 하나의 표.
 * - summary: 행위 제목의 '→' 뒤
 * - file: 저장소 기준 정의 파일 경로
 * - problems: 정의에서 고칠 점(조건 둘 이상을 바꾼 케이스, 없는 값 같은 것)
 * - counts: 조건 값 개수. `covered`는 케이스가 다루는 값(기준값·같은 케이스 포함), `same`은 그 가운데 같은 케이스 줄
 */
export type BehaviorTable = {
  id: string;
  name: string;
  area: string;
  summary: string;
  file: string;
  conditions: ConditionInfo[];
  cases: CaseInfo[];
  groups: RowGroup[];
  problems: string[];
  counts: { values: number; covered: number; same: number; reason: number; missing: number };
};

/** 실행 기록 한 번. time: 실행을 시작한 시각(ISO). */
export type RunSummary = {
  commit: string;
  url: string | null;
  time: string;
  durationMs: number;
  passed: number;
  failed: number;
};

/**
 * 화면에 그릴 전체 자료.
 * - mode: `local`은 실행해보기가 그 자리에서 도는 로컬 화면, `report`는 CI 결과를 붙인 정적 페이지
 * - repoUrl: GitHub 저장소 주소(문서·코드 링크)
 * - areas: 영역 이름(늘어놓는 차례)
 * - run: 마지막 실행. 로컬은 null
 */
export type TableData = {
  generatedAt: string;
  mode: 'local' | 'report';
  repoUrl: string;
  areas: string[];
  behaviors: BehaviorTable[];
  sections: Record<string, DocSection>;
  totals: {
    behaviors: number;
    cases: number;
    passed: number;
    failed: number;
    values: number;
    covered: number;
    same: number;
    reason: number;
    missing: number;
  };
  run: RunSummary | null;
};
