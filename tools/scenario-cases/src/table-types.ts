// 시나리오 케이스 화면(로컬 도구와 GitHub Pages 보고서)이 읽는 데이터(JSON)의 모양.

/** 코드 근거 한 곳. 케이스 문서 링크와 같은 `@codocs` 주석이 달린 제품 코드다. */
export type CodeRef = {
  /** 저장소 기준 경로(`/`로 잇는다) */
  file: string;
  /** 주석 다음 선언의 줄 번호(1부터) */
  line: number;
  /** 선언 이름. 찾지 못하면 null */
  name: string | null;
  /** 주석 설명의 첫 줄. 없으면 빈 문자열 */
  description: string;
};

/** 케이스·이유 문서 링크 하나를 풀어 쓴 것. 섹션 본문은 `TableData.sections`에 있다. */
export type DocRef = {
  /** `[[문서:섹션]]` 그대로 */
  link: string;
  doc: string;
  section: string;
  /** 그 문서와 섹션이 .codocs에 있는지 */
  found: boolean;
  /** 섹션 본문의 첫 줄 */
  firstLine: string;
};

/** 문서 섹션 하나. 옆 패널이 본문과 연결된 코드를 보인다. */
export type DocSection = {
  link: string;
  doc: string;
  section: string;
  /** 문서 파일(저장소 기준). 없으면 null */
  path: string | null;
  /** 섹션 본문(마크다운). 없으면 빈 문자열 */
  body: string;
  /** 이 링크와 같은 `@codocs` 주석이 달린 제품 코드 */
  code: CodeRef[];
};

/** 칸 하나. 기준과 다르면 `changed`다. */
export type Cell = { key: string; value: string; changed: boolean };

/** 결과 상태 */
export type ResultStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky';

/** 기대 결과 하나의 확인 결과. `unchecked`는 앞에서 실패해 확인하지 못한 것이다. */
export type CheckResult = { name: string; status: 'passed' | 'failed' | 'unchecked' };

/** 실행 화면 필름 띠의 한 장. */
export type FilmFrame = {
  /** 보고서 기준 이미지 경로 */
  src: string;
  /** 시험 시작부터 지난 시간(ms) */
  atMs: number;
  /** 실패 지점인지 */
  failed: boolean;
};

/** 실행 결과. CI 보고서에서 채운다. */
export type CaseResult = {
  status: ResultStatus;
  durationMs: number;
  /** 보고서 기준 trace zip 경로. 없으면 null */
  trace: string | null;
  /** 실패 메시지(색 코드를 지운 앞부분). 없으면 null */
  error: string | null;
  /** 기대 결과마다 확인 결과. 케이스의 `expected` 차례와 같다 */
  checks: CheckResult[];
  /** 실행 화면 몇 장. 없으면 빈 배열 */
  film: FilmFrame[];
};

/** 케이스 줄. */
export type CaseRow = {
  number: number;
  id: string;
  /** 실행 기록에서 케이스를 찾는 열쇠(`행위id/케이스id`). 번호가 바뀌어도 같다 */
  key: string;
  /** Playwright 시험 제목 끝의 고르는 표시(`[행위id#번호]`) */
  grepToken: string;
  scenario: string;
  expected: string[];
  cells: Cell[];
  /** 기준에서 바꾼 조건 키 */
  changedKeys: string[];
  docs: DocRef[];
  device: string | null;
  /** 정의 파일에서 케이스가 시작하는 줄(1부터). 찾지 못하면 null */
  line: number | null;
  /** 실행 함수 코드 */
  source: string;
  /** 근거 없음, 기준값과 같은 change처럼 고쳐야 할 점 */
  problems: string[];
  result: CaseResult | null;
  /** 최근 실행 결과(오래된 것부터). 실행 기록이 없으면 빈 배열 */
  history: ResultStatus[];
  /** 이번 PR에서 바뀐 파일의 영향을 받는지 */
  affected: boolean;
};

/** 케이스가 없는 값의 이유. */
export type NoCaseInfo = { reason: string; docs: DocRef[] };

/** 빠진 값의 제안. 도구가 기준 케이스와 근거 문서에서 만든다. */
export type MissingSuggestion = {
  /** 제안 시나리오 */
  scenario: string;
  /** 근거 문서에서 찾은 문장. 못 찾으면 null */
  rule: { link: string; sentence: string } | null;
  /** 정의 파일에 붙일 케이스 뼈대 */
  caseSkeleton: string;
  /** 케이스 대신 이유를 적을 때 붙일 뼈대 */
  noCaseSkeleton: string;
};

/** 조건 × 값 지도의 칸. */
export type ValueCell = {
  value: string;
  /** 이 값을 쓰는 케이스 번호 */
  cases: number[];
  /** `case`는 케이스 있음, `reason`은 케이스 없음+이유 있음, `missing`은 빠진 값 */
  state: 'case' | 'reason' | 'missing';
  noCase: NoCaseInfo | null;
  suggestion: MissingSuggestion | null;
};

export type ConditionColumn = { key: string; label: string; base: string; values: ValueCell[] };

export type BehaviorTable = {
  id: string;
  name: string;
  area: string;
  /** 저장소 기준 정의 파일 경로 */
  file: string;
  conditions: ConditionColumn[];
  cases: CaseRow[];
  /** 행위에서 고칠 점(케이스가 쓰는 값에 둔 이유 같은 것) */
  problems: string[];
  counts: { values: number; covered: number; reason: number; missing: number };
};

export type AreaSummary = {
  area: string;
  behaviors: number;
  cases: number;
  missing: number;
  passed: number;
  failed: number;
};

/** 여러 행위에서 함께 빠진 값(조건 이름과 값이 같은 것). */
export type CommonMissing = { label: string; value: string; behaviors: string[] };

/** 실행 기록 한 번. */
export type RunSummary = {
  commit: string;
  url: string | null;
  /** 실행을 시작한 시각(ISO) */
  time: string;
  durationMs: number;
  passed: number;
  failed: number;
};

export type TableData = {
  generatedAt: string;
  /** `local`은 실행해보기가 있는 로컬 화면, `report`는 CI 결과를 붙인 정적 페이지 */
  mode: 'local' | 'report';
  /** GitHub 저장소 주소(정의 파일·코드 링크) */
  repoUrl: string;
  areas: AreaSummary[];
  behaviors: BehaviorTable[];
  sections: Record<string, DocSection>;
  commonMissing: CommonMissing[];
  totals: {
    behaviors: number;
    cases: number;
    passed: number;
    failed: number;
    values: number;
    covered: number;
    reason: number;
    missing: number;
  };
  /** 마지막 실행. 로컬은 null */
  run: RunSummary | null;
  /** 최근 실행 기록(새것부터). 마지막 실행을 포함한다 */
  runs: RunSummary[];
  /** 이번 PR(main과 비교한 바뀐 파일). 계산하지 않았으면 null */
  changes: { base: string; files: string[] } | null;
};
