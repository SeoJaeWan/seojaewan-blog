import type { HistoryRun } from './build-table.ts';

/** 보고서에 남기는 실행 기록 수 */
export const HISTORY_KEEP = 10;

/**
 * 값이 실행 기록 한 번의 모양인지 본다.
 * @param value 읽은 값
 * @returns 모양이 맞으면 true
 */
function isHistoryRun(value: unknown): value is HistoryRun {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const run = value as Record<string, unknown>;
  return (
    typeof run.commit === 'string' &&
    typeof run.time === 'string' &&
    typeof run.results === 'object' &&
    run.results !== null
  );
}

/**
 * 지난 실행 기록(앞서 올린 보고서의 `history.json`) 앞에 이번 실행을 더한다. 같은 실행이 다시 오면 바꾼다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param previous 지난 기록. 읽지 못했으면 아무 값이나 온다
 * @param current 이번 실행
 * @param keep 남길 수
 * @returns 새것부터의 실행 기록
 */
export function mergeHistory(
  previous: unknown,
  current: HistoryRun,
  keep = HISTORY_KEEP,
): HistoryRun[] {
  const runs = Array.isArray(previous) ? previous.filter(isHistoryRun) : [];
  return [
    current,
    ...runs.filter((run) => !(run.commit === current.commit && run.time === current.time)),
  ].slice(0, keep);
}
