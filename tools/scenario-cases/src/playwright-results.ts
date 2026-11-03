import type { CaseResult, CheckResult } from './table-types.ts';

// Playwright JSON 보고서(`--reporter=json`)에서 쓰는 부분만 적는다.
type JsonAttachment = { name: string; path?: string };
type JsonStep = { title: string; error?: unknown; steps?: JsonStep[] };
type JsonResult = {
  status: string;
  duration: number;
  startTime?: string;
  attachments?: JsonAttachment[];
  errors?: { message?: string }[];
  steps?: JsonStep[];
};
type JsonTest = { results: JsonResult[]; status?: string };
type JsonSpec = { title: string; tests: JsonTest[] };
type JsonSuite = { specs?: JsonSpec[]; suites?: JsonSuite[] };
/** Playwright JSON 보고서 */
export type JsonReport = {
  suites: JsonSuite[];
  stats?: { startTime?: string; duration?: number };
};

/** 보고서에서 꺼낸 케이스 결과. trace는 보고서가 적은 절대 경로다. */
export type ReportedCase = Pick<CaseResult, 'status' | 'durationMs' | 'error'> & {
  tracePath: string | null;
  /** 마지막 시도의 맨 위 단계(기대 결과 `test.step`)와 실패 여부 */
  steps: { title: string; failed: boolean }[];
};

const GREP_TOKEN = /\[[^\]#]+#\d+\]$/u;
// 색 코드(ESC[...m)를 지운다.
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu');
/** 실패 메시지에서 보일 줄 수 */
const ERROR_LINES = 14;

/**
 * 결과 상태를 표의 상태로 바꾼다. 다시 해서 통과하면 `flaky`다.
 * @param test 시험 하나의 결과들
 * @returns 상태
 */
function statusOf(test: JsonTest): CaseResult['status'] {
  const last = test.results.at(-1);
  if (last === undefined) {
    return 'skipped';
  }
  if (last.status === 'passed' && test.results.length > 1) {
    return 'flaky';
  }
  const known = ['passed', 'failed', 'timedOut', 'skipped', 'interrupted'] as const;
  return known.find((status) => status === last.status) ?? 'failed';
}

/**
 * 실패 메시지에서 색 코드를 지우고 앞부분만 남긴다.
 * @param message 메시지
 * @returns 정리한 메시지. 없으면 null
 */
export function cleanError(message: string | undefined): string | null {
  if (message === undefined) {
    return null;
  }
  const lines = message.replace(ansiPattern, '').trimEnd().split('\n');
  return lines.slice(0, ERROR_LINES).join('\n');
}

/**
 * Playwright JSON 보고서에서 케이스마다 마지막 결과, 기대 결과 단계, trace 경로를 꺼낸다.
 * 케이스는 시험 제목 끝의 `[행위id#번호]`로 찾는다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param report JSON 보고서
 * @returns `[행위id#번호]` → 결과
 */
export function readReportedCases(report: JsonReport): Map<string, ReportedCase> {
  const cases = new Map<string, ReportedCase>();
  /**
   * 묶음을 따라 내려가며 시험을 읽는다.
   * @param suite 묶음
   */
  function visit(suite: JsonSuite): void {
    for (const spec of suite.specs ?? []) {
      const token = GREP_TOKEN.exec(spec.title)?.[0];
      const test = spec.tests[0];
      if (token === undefined || test === undefined) {
        continue;
      }
      const last = test.results.at(-1);
      // 실패한 시도에 trace가 남으므로, 마지막 결과에 없으면 앞 시도의 trace를 쓴다.
      const trace = [...test.results]
        .reverse()
        .flatMap((result) => result.attachments ?? [])
        .find((attachment) => attachment.name === 'trace' && attachment.path !== undefined);
      cases.set(token, {
        status: statusOf(test),
        durationMs: test.results.reduce((sum, result) => sum + result.duration, 0),
        tracePath: trace?.path ?? null,
        error: cleanError(last?.errors?.[0]?.message),
        steps: (last?.steps ?? []).map((step) => ({
          title: step.title,
          failed: step.error !== undefined,
        })),
      });
    }
    for (const child of suite.suites ?? []) {
      visit(child);
    }
  }
  for (const suite of report.suites) {
    visit(suite);
  }
  return cases;
}

/**
 * 기대 결과마다 확인 결과를 맞춘다. 단계가 없으면 앞에서 실패해 확인하지 못한 것이다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param expected 케이스의 기대 결과
 * @param steps 보고서의 맨 위 단계
 * @returns 기대 결과 차례의 확인 결과
 */
export function checksOf(expected: readonly string[], steps: ReportedCase['steps']): CheckResult[] {
  return expected.map(
    /**
     * 기대 결과 하나의 단계를 찾아 결과를 정한다.
     * @param name 기대 결과
     * @returns 확인 결과
     */
    (name) => {
      const found = steps.filter((step) => step.title === name);
      if (found.length === 0) {
        return { name, status: 'unchecked' };
      }
      return { name, status: found.some((step) => step.failed) ? 'failed' : 'passed' };
    },
  );
}
