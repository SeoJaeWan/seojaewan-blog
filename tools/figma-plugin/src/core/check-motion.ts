import {
  MOTION_NAME_PATTERN,
  type MotionExport,
  type MotionKeyframe,
  type MotionTime,
  type MotionTrack,
  motionUrl,
} from '../motion-file';
import type { Violation } from './check-structure';
import type {
  EasingData,
  KeyframeData,
  MotionSampleData,
  MotionValue,
  MotionVariable,
  TrackData,
} from './motion-data';

// 모션 견본의 구조 검사와 내보낼 자료 만들기. 피그마 API를 쓰지 않는 순수 함수다.
// 막는 것: 모션 변수 값이 아닌 트랙 길이·시작 지연, 변수에 연결되지 않은 키프레임 이징([[피그마 연동:구조 검사]] 4번).
// 막지 않는 것: 배율·투명도·회전 등이 모션 변수 값과 같으면 짝을 적는다. 이동과 그 밖의 숫자는 보지 않는다.

/** 검사와 내보내기 결과 */
export type MotionCheckResult =
  { ok: true; motion: MotionExport; notices: string[] } | { ok: false; violations: Violation[] };

/** 트랙 길이 변수 이름 앞부분 */
export const DURATION_PREFIX = 'motion/duration/';
/** 시작 지연 변수 이름 앞부분 */
export const DELAY_PREFIX = 'motion/delay/';
/** 이징 변수 이름 앞부분 */
export const EASING_PREFIX = 'motion/easing/';
/** 값 짝을 찾는 변수 이름 앞부분 */
const MOTION_PREFIX = 'motion/';
/** 짝을 찾지 않는 항목(이동은 실행 중 값이거나 구성이다) */
const UNPAIRED_PROPERTY_PATTERN = /^TRANSLATION_/u;

// 변수 값은 ms, 키프레임 위치는 초라 곱해서 비교한다. 소수 입력(0.167초)의 오차를 허용한다.
const TIME_TOLERANCE_MS = 0.5;
// 키프레임 값과 변수 값을 같다고 보는 차이다.
const VALUE_TOLERANCE = 1e-6;
const MS_PER_SECOND = 1000;

/**
 * 모션 견본 하나를 검사하고, 통과하면 내보낼 자료(`figma/motions/<이름>.json`)를 만든다.
 * 위반은 견본의 트랙마다 위치·이유·고칠 방법을 담아 한 번에 돌려준다.
 * @codocs [[피그마 연동:모션]]
 * @codocs [[피그마 연동:구조 검사]]
 * @param sample 견본에서 읽은 트랙
 * @param variables `motion/*` 변수
 * @param fileKey 피그마 파일 키(figma.json)
 * @returns 내보낼 자료와 알림, 또는 위반 목록
 */
export function checkMotionSample(
  sample: MotionSampleData,
  variables: readonly MotionVariable[],
  fileKey: string,
): MotionCheckResult {
  const violations: Violation[] = [];
  const notices: string[] = [];
  /**
   * 위반을 더한다.
   * @param path 견본 기준 위치(레이어 경로와 항목). 견본 자체면 빈 문자열
   * @param reason 이유
   * @param fix 고칠 방법
   * @param nodeId 고칠 노드 ID. 없으면 견본 프레임
   */
  function add(path: string, reason: string, fix: string, nodeId: string = sample.nodeId): void {
    violations.push({
      where: path === '' ? sample.name : `${sample.name} / ${path}`,
      reason,
      fix,
      nodeId,
    });
  }

  if (!MOTION_NAME_PATTERN.test(sample.name)) {
    add(
      '',
      '견본 이름이 모션 클래스 이름 꼴(`motion-` + 소문자·숫자·`-`)이 아니라 파일과 클래스 이름을 정할 수 없다',
      '견본 프레임 이름을 [[디자인 기반:모션]] 표의 클래스 이름(예: `motion-window-open`)으로 바꾼다.',
    );
  }
  for (const problem of sample.problems) {
    add(problem.path, problem.reason, problem.fix, problem.nodeId);
  }
  if (sample.tracks.length === 0 && sample.problems.length === 0) {
    add(
      '',
      '견본 안에 키프레임이 걸린 노드가 없다',
      '견본에 놓은 인스턴스(요소 전체가 움직이는 것)나 자산 원본(안쪽이 움직이는 것)에 키프레임을 건다.',
    );
  }

  const durations = byPrefix(variables, DURATION_PREFIX);
  const delays = byPrefix(variables, DELAY_PREFIX);
  const pairs = variables.filter(isValuePairVariable);
  const tracks: MotionTrack[] = [];
  for (const track of sortedTracks(sample.tracks)) {
    const where = `${track.path === '' ? track.node : track.path} / ${track.property}`;
    const first = track.keyframes[0];
    const last = track.keyframes.at(-1);
    if (first === undefined || last === undefined) {
      add(
        where,
        '키프레임이 없는 트랙이다',
        '트랙을 지우거나 키프레임을 둘 이상 건다.',
        track.nodeId,
      );
      continue;
    }
    const durationMs = (last.time - first.time) * MS_PER_SECOND;
    const delayMs = first.time * MS_PER_SECOND;
    const duration = matchTime(durationMs, durations, notices, where);
    if (duration.token === null) {
      add(
        where,
        `트랙 길이(첫 키프레임 → 끝 키프레임) ${formatMs(durationMs)}가 \`${DURATION_PREFIX}*\` 변수 값(${listValues(durations)}) 가운데 어느 것과도 같지 않다`,
        '끝 키프레임을 옮겨 트랙 길이를 쓰려는 시간 변수 값(초 단위로 바꾼 값, 예: 250ms → 0.25초)에 맞춘다. 필요한 시간이 없으면 Motion 변수를 먼저 더한다.',
        track.nodeId,
      );
    }
    const delay =
      Math.abs(delayMs) <= TIME_TOLERANCE_MS
        ? { ms: 0, token: null }
        : matchTime(delayMs, delays, notices, where);
    if (delay.ms !== 0 && delay.token === null) {
      add(
        where,
        `시작 지연(첫 키프레임 위치) ${formatMs(delayMs)}가 \`${DELAY_PREFIX}*\` 변수 값(${listValues(delays)}) 가운데 어느 것과도 같지 않다`,
        '첫 키프레임을 0초로 옮기거나, 쓰려는 지연 변수 값(초 단위)에 맞춘다. 필요한 지연이 없으면 Motion 변수를 먼저 더한다.',
        track.nodeId,
      );
    }
    const keyframes: MotionKeyframe[] = [];
    for (const [index, keyframe] of track.keyframes.entries()) {
      const easing =
        index === 0
          ? null
          : easingToken(keyframe, index, where, (path, reason, fix) => {
              add(path, reason, fix, track.nodeId);
            });
      keyframes.push({
        time: keyframe.time * MS_PER_SECOND,
        offset: durationMs === 0 ? 0 : (keyframe.time - first.time) / (last.time - first.time),
        value: keyframe.value,
        easing,
        valueToken: UNPAIRED_PROPERTY_PATTERN.test(track.property)
          ? null
          : valueToken(
              keyframe.value,
              pairs,
              notices,
              `${where} ${String(index + 1)}번째 키프레임`,
            ),
      });
    }
    tracks.push({
      node: track.node,
      nodeKind: track.nodeKind,
      path: track.path,
      property: track.property,
      operation: track.operation,
      duration,
      delay,
      keyframes,
    });
  }
  if (violations.length > 0) {
    return { ok: false, violations };
  }

  const start = Math.min(...tracks.map((track) => track.delay.ms));
  const end = Math.max(...tracks.map((track) => track.delay.ms + track.duration.ms));
  return {
    ok: true,
    notices,
    motion: {
      name: sample.name,
      nodeId: sample.nodeId,
      url: motionUrl(fileKey, sample.nodeId),
      duration: matchTime(end - start, durations, notices, '애니메이션 전체'),
      delay: start === 0 ? { ms: 0, token: null } : matchTime(start, delays, notices, '애니메이션'),
      iterations: null,
      tracks,
    },
  };
}

/**
 * 키프레임 이징이 `motion/easing/*` EASING 변수에 연결됐는지 보고 변수 이름을 돌려준다. 아니면 위반을 더한다.
 * @param keyframe 키프레임
 * @param index 트랙 안 순서(0부터)
 * @param where 트랙 위치
 * @param add 위반을 더하는 함수
 * @returns 이징 변수 이름, 위반이면 null
 */
function easingToken(
  keyframe: KeyframeData,
  index: number,
  where: string,
  add: (path: string, reason: string, fix: string) => void,
): string | null {
  const label = `${where} ${String(index + 1)}번째 키프레임(${formatMs(keyframe.time * MS_PER_SECOND)})`;
  const reason = easingProblem(keyframe.easing);
  if (reason === null && keyframe.easing.kind === 'variable') {
    return keyframe.easing.name;
  }
  add(
    label,
    reason ?? '이징을 읽지 못했다',
    `키프레임 이징을 \`${EASING_PREFIX}*\` 변수(EASING 타입)에 연결한다. 동작별 이징은 [[디자인 기반:모션]] 표를 본다.`,
  );
  return null;
}

/**
 * 이징이 규칙에 맞지 않는 이유를 구한다.
 * @param easing 이징
 * @returns 이유, 맞으면 null
 */
function easingProblem(easing: EasingData): string | null {
  switch (easing.kind) {
    case 'variable':
      if (!easing.name.startsWith(EASING_PREFIX)) {
        return `이징이 \`${EASING_PREFIX}*\`가 아닌 변수 \`${easing.name}\`에 연결되어 있다`;
      }
      return easing.resolvedType === 'EASING'
        ? null
        : `이징 변수 \`${easing.name}\`가 EASING 타입이 아니라(${easing.resolvedType}) 피그마가 곡선으로 재생하지 않는다`;
    case 'missing-variable':
      return `이징이 연결된 변수(${easing.id})를 이 파일에서 찾을 수 없다`;
    case 'unbound':
      return `이징(${easing.description})이 변수에 연결되어 있지 않다`;
    case 'unknown':
      return '키프레임을 정의한 노드를 찾지 못해 이징이 변수에 연결됐는지 알 수 없다';
  }
}

/**
 * 시간 값과 같은 변수를 찾는다. 같은 값의 변수가 여럿이면 이름순 첫 변수를 쓰고 알린다.
 * @param ms 시간(ms)
 * @param variables 같은 앞부분의 FLOAT 변수
 * @param notices 알림 목록
 * @param where 알림에 쓸 위치
 * @returns 시간 값과 변수 이름(없으면 null)
 */
function matchTime(
  ms: number,
  variables: readonly MotionVariable[],
  notices: string[],
  where: string,
): MotionTime {
  const matches = variables.filter(
    (variable) => variable.value !== null && Math.abs(variable.value - ms) <= TIME_TOLERANCE_MS,
  );
  return { ms, token: pick(matches, notices, where, formatMs(ms)) };
}

/**
 * 배율·투명도·회전 등 숫자 값과 같은 `motion/*` 변수를 찾는다. 벡터는 x와 y가 같을 때만 본다.
 * @param value 키프레임 값
 * @param variables 짝을 찾는 FLOAT 변수
 * @param notices 알림 목록
 * @param where 알림에 쓸 위치
 * @returns 변수 이름, 없으면 null
 */
function valueToken(
  value: MotionValue,
  variables: readonly MotionVariable[],
  notices: string[],
  where: string,
): string | null {
  let number: number | null = null;
  if (typeof value === 'number') {
    number = value;
  } else if (
    typeof value === 'object' &&
    'x' in value &&
    'y' in value &&
    Object.keys(value).length === 2 &&
    value.x === value.y
  ) {
    number = value.x;
  }
  if (number === null) {
    return null;
  }
  const target = number;
  const matches = variables.filter(
    (variable) => variable.value !== null && Math.abs(variable.value - target) <= VALUE_TOLERANCE,
  );
  return pick(matches, notices, where, String(target));
}

/**
 * 같은 값의 변수 가운데 이름순 첫 변수를 고른다. 여럿이면 알린다.
 * @param matches 같은 값의 변수
 * @param notices 알림 목록
 * @param where 알림에 쓸 위치
 * @param shown 알림에 쓸 값
 * @returns 변수 이름, 없으면 null
 */
function pick(
  matches: readonly MotionVariable[],
  notices: string[],
  where: string,
  shown: string,
): string | null {
  const names = matches.map((variable) => variable.name).sort();
  const [first] = names;
  if (names.length > 1) {
    notices.push(
      `${where}: 값 ${shown}과 같은 변수가 여럿(${names.join(', ')})이라 ${String(first)}로 적는다.`,
    );
  }
  return first ?? null;
}

/**
 * 이름이 앞부분으로 시작하는 FLOAT 변수를 고른다.
 * @param variables 모션 변수
 * @param prefix 이름 앞부분
 * @returns 고른 변수
 */
function byPrefix(variables: readonly MotionVariable[], prefix: string): MotionVariable[] {
  return variables.filter(
    (variable) => variable.name.startsWith(prefix) && variable.value !== null,
  );
}

/**
 * 트랙을 레이어 경로·노드·항목·연산 순으로 정렬한다. 다시 내보내도 순서가 같다.
 * @param tracks 트랙
 * @returns 정렬한 새 목록
 */
function sortedTracks(tracks: readonly TrackData[]): TrackData[] {
  return [...tracks].sort(compareTracks);
}

/**
 * 두 트랙을 레이어 경로·노드·항목·연산 순으로 비교한다.
 * @param a 왼쪽 트랙
 * @param b 오른쪽 트랙
 * @returns 정렬 순서
 */
function compareTracks(a: TrackData, b: TrackData): number {
  return (
    compare(a.path, b.path) ||
    compare(a.node, b.node) ||
    compare(a.property, b.property) ||
    compare(a.operation, b.operation)
  );
}

/**
 * 값 짝을 찾을 변수인지 본다. 시간·지연 변수(ms)는 키프레임 값과 비교하지 않는다.
 * @param variable 모션 변수
 * @returns `motion/*` FLOAT 변수이고 시간·지연이 아니면 true
 */
function isValuePairVariable(variable: MotionVariable): boolean {
  return (
    variable.name.startsWith(MOTION_PREFIX) &&
    variable.value !== null &&
    !variable.name.startsWith(DURATION_PREFIX) &&
    !variable.name.startsWith(DELAY_PREFIX)
  );
}

/**
 * 로케일과 상관없이 문자열을 비교한다.
 * @param left 왼쪽
 * @param right 오른쪽
 * @returns 정렬 순서
 */
function compare(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

/**
 * 변수 값 목록을 메시지용으로 만든다.
 * @param variables 변수
 * @returns `fast 167ms, normal 250ms` 꼴, 없으면 `변수 없음`
 */
function listValues(variables: readonly MotionVariable[]): string {
  if (variables.length === 0) {
    return '변수 없음';
  }
  return variables
    .map((variable) => `${variable.name.split('/').at(-1) ?? ''} ${formatMs(variable.value ?? 0)}`)
    .join(', ');
}

/**
 * ms 값을 메시지용으로 만든다.
 * @param ms 시간
 * @returns `250ms` 꼴(소수 셋째 자리까지)
 */
function formatMs(ms: number): string {
  return `${String(Math.round(ms * 1000) / 1000 + 0)}ms`;
}
