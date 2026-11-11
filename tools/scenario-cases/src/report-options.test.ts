import { describe, expect, it } from 'vitest';

import { isFailedStatus, keepsTrace, reportPlanOf } from './report-options.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('보고서 설정', () => {
  it('인자가 없으면 main 보고서다: 뷰어를 복사하고 실행 기록을 쓰며 모든 trace를 담는다', () => {
    expect(reportPlanOf({})).toEqual({
      traceViewer: 'trace/',
      shouldCopyViewer: true,
      isFailedOnly: false,
      pr: null,
      shouldWriteHistory: true,
    });
  });

  it('PR 실패 보고서는 사이트 루트의 뷰어를 함께 쓰고 실행 기록을 쓰지 않는다', () => {
    expect(
      reportPlanOf({
        isOnlyFailed: true,
        pr: '42',
        isWithoutHistory: true,
        traceViewer: '../../trace',
      }),
    ).toEqual({
      traceViewer: '../../trace/',
      shouldCopyViewer: false,
      isFailedOnly: true,
      pr: 42,
      shouldWriteHistory: false,
    });
  });

  it.each(['0', '-1', 'abc', '1.5'])('PR 번호 %s는 받지 않는다', (pr) => {
    expect(() => reportPlanOf({ pr })).toThrow('--pr');
  });
});

// @codocs [[테스트 작성 규칙:E2E]]
describe('담는 trace', () => {
  it.each(['failed', 'timedOut', 'interrupted'] as const)('%s는 실패다', (status) => {
    expect(isFailedStatus(status)).toBe(true);
    expect(keepsTrace(status, true)).toBe(true);
  });

  it.each(['passed', 'flaky', 'skipped'] as const)('%s는 실패만 담는 보고서에서 뺀다', (status) => {
    expect(isFailedStatus(status)).toBe(false);
    expect(keepsTrace(status, true)).toBe(false);
    expect(keepsTrace(status, false)).toBe(true);
  });
});
