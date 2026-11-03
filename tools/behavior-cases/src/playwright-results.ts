import type { CaseResult } from './table-types.ts';

// Playwright JSON 보고서(`--reporter=json`)에서 쓰는 부분만 적는다.
type JsonAttachment = { name: string; path?: string };
type JsonResult = {
  status: string;
  duration: number;
  attachments?: JsonAttachment[];
  errors?: { message?: string }[];
};
type JsonTest = { results: JsonResult[]; status?: string };
type JsonSpec = { title: string; tests: JsonTest[] };
type JsonSuite = { specs?: JsonSpec[]; suites?: JsonSuite[] };
/** Playwright JSON 보고서 */
export type JsonReport = { suites: JsonSuite[] };

/** 보고서에서 꺼낸 케이스 결과. trace는 보고서가 적은 절대 경로다. */
export type ReportedCase = Omit<CaseResult, 'trace'> & { tracePath: string | null };

const GREP_TOKEN = /\[[^\]#]+#\d+\]$/u;
// 색 코드(ESC[...m)를 지운다.
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu');

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
 * Playwright JSON 보고서에서 케이스마다 마지막 결과와 trace 경로를 꺼낸다.
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
      const message = last?.errors?.[0]?.message?.replace(ansiPattern, '').split('\n')[0] ?? null;
      cases.set(token, {
        status: statusOf(test),
        durationMs: test.results.reduce((sum, result) => sum + result.duration, 0),
        tracePath: trace?.path ?? null,
        error: message,
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
