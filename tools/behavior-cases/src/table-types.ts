// 행위 표 화면과 정적 결과 페이지가 읽는 표 데이터(JSON)의 모양.

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

/** 케이스 문서 링크 하나를 풀어 쓴 것. */
export type DocRef = {
  /** `[[문서:섹션]]` 그대로 */
  link: string;
  doc: string;
  section: string;
  /** 그 문서와 섹션이 .codocs에 있는지 */
  found: boolean;
  /** 섹션 본문의 첫 줄 */
  firstLine: string;
  /** 문서 파일(저장소 기준). 없으면 null */
  path: string | null;
  /** 이 링크와 같은 `@codocs` 주석이 달린 제품 코드 */
  code: CodeRef[];
};

/** 칸 하나. 기준과 다르면 `changed`다. */
export type Cell = { key: string; value: string; changed: boolean };

/** 실행 결과. CI 결과 페이지에서만 채운다. */
export type CaseResult = {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky';
  durationMs: number;
  /** 결과 페이지 기준 trace zip 경로. 없으면 null */
  trace: string | null;
  /** 실패 메시지 첫 줄 */
  error: string | null;
};

/** 케이스 줄. */
export type CaseRow = {
  number: number;
  id: string;
  /** Playwright 시험 제목 끝의 고르는 표시(`[행위id#번호]`) */
  grepToken: string;
  cells: Cell[];
  /** 기준에서 바꾼 조건 수 */
  changedCount: number;
  purpose: string;
  docs: DocRef[];
  device: string | null;
  /** 근거 없음, 기준값과 같은 change처럼 고쳐야 할 점 */
  problems: string[];
  result: CaseResult | null;
};

/** 빠진 값 줄. 기준값도 아니고 어떤 케이스도 바꾸지 않은 값이다. */
export type MissingRow = { key: string; label: string; value: string };

export type ConditionColumn = { key: string; label: string; values: string[]; base: string };

export type BehaviorTable = {
  id: string;
  name: string;
  area: string;
  /** 저장소 기준 정의 파일 경로 */
  file: string;
  conditions: ConditionColumn[];
  cases: CaseRow[];
  missing: MissingRow[];
};

export type AreaSummary = { area: string; behaviors: number; cases: number; missing: number };

export type TableData = {
  generatedAt: string;
  /** `local`은 실행해보기가 있는 로컬 화면, `report`는 CI 결과를 붙인 정적 페이지 */
  mode: 'local' | 'report';
  areas: AreaSummary[];
  behaviors: BehaviorTable[];
  totals: { behaviors: number; cases: number; missing: number; passed: number; failed: number };
  /** 결과 페이지의 실행 정보(커밋, 실행 주소). 로컬은 null */
  run: { commit: string; url: string | null } | null;
};
