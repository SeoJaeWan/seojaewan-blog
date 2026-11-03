import { describe, expect, it } from 'vitest';

import type { HistoryRun } from './build-table.ts';
import { mergeHistory } from './history.ts';

/**
 * 실행 기록 한 번을 만든다.
 * @param commit 커밋
 * @param time 시각
 * @returns 실행 기록
 */
function runOf(commit: string, time: string): HistoryRun {
  return { commit, time, url: null, durationMs: 1, passed: 1, failed: 0, results: {} };
}

// @codocs [[테스트 작성 규칙:E2E]]
describe('실행 기록', () => {
  it('지난 기록 앞에 이번 실행을 더하고 정한 수만 남긴다', () => {
    const previous = [runOf('b', '2'), runOf('a', '1')];
    expect(mergeHistory(previous, runOf('c', '3'), 2).map((run) => run.commit)).toEqual(['c', 'b']);
  });

  it('같은 실행이 다시 오면 겹치지 않게 바꾼다', () => {
    const previous = [runOf('c', '3'), runOf('b', '2')];
    expect(mergeHistory(previous, runOf('c', '3')).map((run) => run.commit)).toEqual(['c', 'b']);
  });

  it('지난 기록을 읽지 못했거나 모양이 다르면 이번 실행부터 쌓는다', () => {
    expect(mergeHistory({ broken: true }, runOf('c', '3'))).toHaveLength(1);
    expect(mergeHistory([{ commit: 1 }], runOf('c', '3'))).toHaveLength(1);
  });
});
