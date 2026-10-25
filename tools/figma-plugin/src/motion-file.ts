import type { MotionNodeKind, MotionValue } from './core/motion-data';
import { type JsonObject, type JsonValue, stableStringify } from './stable-json';

// 애니메이션 견본마다 내보내는 `figma/motions/<이름>.json`의 형식. 형식은 이 파일 한 곳에서 정한다.
// 모션 시간 검사(tools/figma-parity)는 패키지가 달라 이 타입을 가져다 쓰지 않고, 읽을 때 필요한 값만 다시 검증한다
// (export.json과 같은 방식). 계약은 [[피그마 연동:모션]]에 있다.

/** 시간 값(ms)과 그 값과 같은 모션 변수. 같은 변수가 없으면 token이 null이다 */
export type MotionTime = {
  ms: number;
  /** `motion/duration/*`·`motion/delay/*` 변수 이름 */
  token: string | null;
};

/** 키프레임 하나 */
export type MotionKeyframe = {
  /** 타임라인 위치(ms) */
  time: number;
  /** 트랙 안 위치(0~1). CSS `@keyframes`의 퍼센트로 옮긴다 */
  offset: number;
  value: MotionValue;
  /** 이전 키프레임에서 이 키프레임까지의 이징 변수 이름(`motion/easing/*`). 첫 키프레임은 쓰이지 않아 null이다 */
  easing: string | null;
  /** 값과 같은 `motion/*` 변수(배율·투명도·회전 등). 이동과 짝이 없는 값은 null이다 */
  valueToken: string | null;
};

/** 노드 하나의 항목 하나 */
export type MotionTrack = {
  /** 노드 이름. 견본 안 인스턴스는 컴포넌트 이름, 자산 원본에서 이어진 것은 자산 이름(`progress-ring/Arc`) */
  node: string;
  nodeKind: MotionNodeKind;
  /** 견본 기준 레이어 경로 */
  path: string;
  /** 피그마 항목 이름(`ROTATION`, `SCALE_XY`, `OPACITY`, `PATH_TRIM_END` 등) */
  property: string;
  /** 피그마 트랙 연산(`SET`, `OFFSET`, `SCALE`) */
  operation: string;
  /** 트랙 길이(첫 키프레임 → 끝 키프레임)와 그 `motion/duration/*` 변수 */
  duration: MotionTime;
  /** 시작 지연(첫 키프레임 위치)과 그 `motion/delay/*` 변수. 0이면 token이 null이다 */
  delay: MotionTime;
  keyframes: MotionKeyframe[];
};

/** `figma/motions/<이름>.json` */
export type MotionExport = {
  /** 견본 이름(모션 클래스 이름, `motion-progress-ring`) */
  name: string;
  /** 견본 프레임 노드 ID */
  nodeId: string;
  /** 피그마 견본 링크(figma.json의 파일 키) */
  url: string;
  /** 애니메이션 전체 길이(가장 이른 첫 키프레임 → 가장 늦은 끝 키프레임)와 같은 변수 */
  duration: MotionTime;
  /** 애니메이션 시작 지연(가장 이른 첫 키프레임)과 같은 변수 */
  delay: MotionTime;
  /**
   * 반복 횟수. 피그마 플러그인 API로는 반복 여부를 읽을 수 없어 늘 null이다.
   * 반복은 [[디자인 기반:모션]] 표가 기준이고 사람이 본다.
   */
  iterations: number | null;
  /** 노드 경로·항목 순으로 정렬한 트랙 */
  tracks: MotionTrack[];
};

/** 견본 이름 꼴. 모션 클래스 이름이자 파일 이름이다 */
export const MOTION_NAME_PATTERN = /^motion-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/**
 * 모션 json 문자열을 만든다. 키를 정렬하고 숫자는 정한 자리에서 반올림한 값만 담아,
 * 같은 피그마를 다시 내보내면 같은 바이트가 나온다.
 * @codocs [[피그마 연동:모션]]
 * @param motion 모션 자료
 * @returns 키를 정렬한 JSON 문자열(끝 줄바꿈 포함)
 */
export function motionText(motion: MotionExport): string {
  return stableStringify({
    name: motion.name,
    nodeId: motion.nodeId,
    url: motion.url,
    duration: timeJson(motion.duration),
    delay: timeJson(motion.delay),
    iterations: motion.iterations,
    tracks: motion.tracks.map(trackJson),
  });
}

/**
 * 트랙을 JSON으로 옮긴다.
 * @param track 트랙
 * @returns JSON 객체
 */
function trackJson(track: MotionTrack): JsonObject {
  return {
    node: track.node,
    nodeKind: track.nodeKind,
    path: track.path,
    property: track.property,
    operation: track.operation,
    duration: timeJson(track.duration),
    delay: timeJson(track.delay),
    keyframes: track.keyframes.map(keyframeJson),
  };
}

/**
 * 키프레임을 JSON으로 옮긴다. 숫자는 반올림한다.
 * @param keyframe 키프레임
 * @returns JSON 객체
 */
function keyframeJson(keyframe: MotionKeyframe): JsonObject {
  return {
    time: roundMs(keyframe.time),
    offset: roundValue(keyframe.offset),
    value: valueJson(keyframe.value),
    easing: keyframe.easing,
    valueToken: keyframe.valueToken,
  };
}

/**
 * 견본 링크를 만든다.
 * @codocs [[피그마 연동:모션]]
 * @param fileKey 피그마 파일 키(figma.json)
 * @param nodeId 견본 노드 ID(`12:34`)
 * @returns `https://www.figma.com/design/<파일 키>?node-id=12-34`
 */
export function motionUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replaceAll(':', '-')}`;
}

/**
 * ms 값을 0.001ms 자리에서 반올림한다(-0은 0으로).
 * @param value ms
 * @returns 반올림한 값
 */
export function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000 + 0;
}

/**
 * 키프레임 값과 위치를 0.0001 자리에서 반올림한다(-0은 0으로).
 * @param value 값
 * @returns 반올림한 값
 */
export function roundValue(value: number): number {
  return Math.round(value * 10000) / 10000 + 0;
}

/**
 * 시간 값을 JSON으로 옮긴다.
 * @param time 시간 값
 * @returns JSON 객체
 */
function timeJson(time: MotionTime): JsonObject {
  return { ms: roundMs(time.ms), token: time.token };
}

/**
 * 키프레임 값을 JSON으로 옮긴다. 숫자는 반올림한다.
 * @param value 키프레임 값
 * @returns JSON 값
 */
function valueJson(value: MotionValue): JsonValue {
  if (typeof value === 'number') {
    return roundValue(value);
  }
  if (typeof value !== 'object') {
    return value;
  }
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = roundValue(item);
  }
  return result;
}
