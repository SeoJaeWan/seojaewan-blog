import type { ReportOptions, ResultStatus } from './table-types.ts';
import { TRACE_VIEWER_DIR } from './trace-viewer.ts';

/** 명령 인자에서 읽은 보고서 설정과, 뷰어 복사·실행 기록 쓰기 여부 */
export type ReportPlan = ReportOptions & { shouldCopyViewer: boolean; shouldWriteHistory: boolean };

/**
 * `build:report`의 명령 인자를 보고서 설정으로 바꾼다.
 * `--trace-viewer`를 주면 뷰어를 보고서마다 복사하지 않고 그 주소의 뷰어(사이트 루트의 `trace/`)를 함께 쓴다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param args 명령 인자
 * @param args.isOnlyFailed 실패한 케이스만 담는다(`--only-failed`)
 * @param args.pr PR 번호(`--pr`)
 * @param args.isWithoutHistory 실행 기록을 읽지도 쓰지도 않는다(`--no-history`)
 * @param args.traceViewer 함께 쓸 Trace Viewer 주소(`--trace-viewer`)
 * @returns 보고서 설정
 */
export function reportPlanOf(args: {
  isOnlyFailed?: boolean;
  pr?: string;
  isWithoutHistory?: boolean;
  traceViewer?: string;
}): ReportPlan {
  let pr: number | null = null;
  if (args.pr !== undefined) {
    pr = Number(args.pr);
    if (!Number.isInteger(pr) || pr <= 0) {
      throw new Error(`--pr에는 PR 번호를 준다: ${args.pr}`);
    }
  }
  const shared = args.traceViewer;
  return {
    traceViewer:
      shared === undefined ? `${TRACE_VIEWER_DIR}/` : shared.endsWith('/') ? shared : `${shared}/`,
    shouldCopyViewer: shared === undefined,
    isFailedOnly: args.isOnlyFailed === true,
    pr,
    shouldWriteHistory: args.isWithoutHistory !== true,
  };
}

/**
 * 결과가 실패인지 본다. 통과, 다시 해서 통과(`flaky`), 건너뜀이 아니면 실패다.
 * @param status 결과 상태
 * @returns 실패면 true
 */
export function isFailedStatus(status: ResultStatus): boolean {
  return status !== 'passed' && status !== 'flaky' && status !== 'skipped';
}

/**
 * 케이스의 trace를 보고서에 담을지 정한다. 실패한 케이스만 담는 보고서는 실패한 케이스의 trace만 담는다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param status 케이스 결과 상태
 * @param isFailedOnly 실패한 케이스만 담는 보고서인지
 * @returns 담으면 true
 */
export function keepsTrace(status: ResultStatus, isFailedOnly: boolean): boolean {
  return !isFailedOnly || isFailedStatus(status);
}
