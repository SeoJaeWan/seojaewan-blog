/** trace의 화면 한 장. */
export type TraceFrame = {
  /** zip 안의 이미지 경로 */
  file: string;
  /** trace 시계(ms) */
  timestamp: number;
};

/** trace에서 읽은 시간 흐름. */
export type TraceTimeline = {
  frames: TraceFrame[];
  /** 시험이 시작한 trace 시각 */
  start: number;
  /** 처음 오류가 난 trace 시각. 오류가 없으면 null */
  failAt: number | null;
};

/** 필름 띠에서 고른 한 장. */
export type PickedFrame = TraceFrame & { failed: boolean };

/**
 * 객체에서 숫자 속성을 읽는다.
 * @param value 객체
 * @param key 속성 이름
 * @returns 숫자. 없으면 null
 */
function numberOf(value: object, key: string): number | null {
  const found: unknown = (value as Record<string, unknown>)[key];
  return typeof found === 'number' ? found : null;
}

/**
 * trace 파일들(`*.trace`, JSON 줄)에서 화면 프레임, 시작 시각, 처음 오류 시각을 읽는다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param traces trace 파일 내용들
 * @returns 시간 흐름
 */
export function readTraceTimeline(traces: readonly string[]): TraceTimeline {
  const frames: TraceFrame[] = [];
  let start = Number.POSITIVE_INFINITY;
  let failAt: number | null = null;
  for (const text of traces) {
    for (const line of text.split('\n')) {
      if (line.trim() === '') {
        continue;
      }
      let event: unknown;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof event !== 'object' || event === null || !('type' in event)) {
        continue;
      }
      if (event.type === 'screencast-frame') {
        const timestamp = numberOf(event, 'timestamp');
        const file =
          'file' in event && typeof event.file === 'string'
            ? event.file
            : 'sha1' in event && typeof event.sha1 === 'string'
              ? `resources/${event.sha1}`
              : null;
        if (timestamp !== null && file !== null) {
          frames.push({ file, timestamp });
        }
      } else if (event.type === 'before') {
        start = Math.min(start, numberOf(event, 'startTime') ?? start);
      } else if (event.type === 'after' && 'error' in event && event.error !== undefined) {
        const endTime = numberOf(event, 'endTime');
        if (endTime !== null && (failAt === null || endTime < failAt)) {
          failAt = endTime;
        }
      }
    }
  }
  frames.sort((a, b) => a.timestamp - b.timestamp);
  if (!Number.isFinite(start)) {
    start = frames[0]?.timestamp ?? 0;
  }
  return { frames, start, failAt };
}

/**
 * 필름 띠에 넣을 프레임을 고르게 고른다. 실패하면 실패 지점 직전 프레임을 마지막 장으로 두고 표시한다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param timeline trace 시간 흐름
 * @param count 고를 장 수
 * @returns 고른 프레임(시간 차례)
 */
export function pickFrames(timeline: TraceTimeline, count: number): PickedFrame[] {
  const { frames, failAt } = timeline;
  if (frames.length === 0) {
    return [];
  }
  const before = failAt === null ? frames : frames.filter((frame) => frame.timestamp <= failAt);
  const usable = before.length === 0 ? frames.slice(0, 1) : before;
  const picked: TraceFrame[] = [];
  for (let index = 0; index < count; index += 1) {
    const at =
      count === 1 ? usable.length - 1 : Math.round((index * (usable.length - 1)) / (count - 1));
    const frame = usable[at];
    if (frame !== undefined && !picked.includes(frame)) {
      picked.push(frame);
    }
  }
  return picked.map((frame, index) => ({
    ...frame,
    failed: failAt !== null && index === picked.length - 1,
  }));
}
