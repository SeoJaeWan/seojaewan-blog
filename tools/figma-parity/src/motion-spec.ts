/**
 * 피그마 플러그인이 쓴 `figma/motions/<이름>.json`에서 모션 시간 검사에 필요한 값만 읽고 검증한다.
 * 형식은 플러그인(tools/figma-plugin/src/motion-file.ts)이 정하고, 패키지가 달라 타입을 가져오지 않고
 * 여기서는 읽는 값만 다시 확인한다(export.json을 읽는 variant-name.ts와 같은 방식).
 */

/** run-motion-check.ts가 Playwright Test에 검사할 견본 목록(JSON 배열)을 넘기는 환경 변수 */
export const MOTION_SELECTION_ENV = 'MOTION_CHECK_SELECTION';

/** 트랙 하나에서 검사하는 값 */
export type MotionSpecTrack = {
  /** 메시지에 쓰는 이름(`progress-ring/Arc ROTATION`) */
  label: string;
  /** 트랙 길이(ms)와 그 `motion/duration/*` 토큰 */
  duration: { ms: number; token: string };
  /** 시작 지연(ms)과 그 `motion/delay/*` 토큰. 지연이 없으면 token이 null이다 */
  delay: { ms: number; token: string | null };
  /** 첫 키프레임 뒤 키프레임마다의 이징 토큰(`motion/easing/*`) */
  easings: string[];
};

/** 모션 시간 검사에 쓰는 json 값 */
export type MotionSpec = {
  /** 견본 이름(모션 클래스 이름) */
  name: string;
  /** 견본 링크 */
  url: string;
  /** 반복 횟수. 피그마에서 알 수 없으면 null */
  iterations: number | null;
  tracks: MotionSpecTrack[];
};

/**
 * 모션 json을 검증하고 검사에 쓰는 값으로 바꾼다. 트랙 길이 토큰이 없거나 첫 키프레임 뒤 이징 토큰이 없으면
 * 플러그인 검사를 거치지 않은 자료라 실패한다.
 * @codocs [[피그마 연동:모션]]
 * @param value json을 파싱한 값
 * @param where 오류 메시지에 쓸 위치(파일 경로)
 * @returns 검사에 쓰는 값
 */
export function parseMotionSpec(value: unknown, where: string): MotionSpec {
  const entry = expectRecord(value, where);
  const name = expectString(entry.name, `${where}.name`);
  const url = expectString(entry.url, `${where}.url`);
  const iterations =
    entry.iterations === null ? null : expectNumber(entry.iterations, `${where}.iterations`);
  if (!Array.isArray(entry.tracks) || entry.tracks.length === 0) {
    throw new Error(`${where}.tracks: 트랙이 하나 이상 있는 배열이어야 한다.`);
  }
  const tracks = entry.tracks.map((item: unknown, index) =>
    parseTrack(item, `${where}.tracks[${String(index)}]`),
  );
  return { name, url, iterations, tracks };
}

/**
 * 트랙 하나를 읽는다.
 * @param value 트랙 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 검사에 쓰는 트랙 값
 */
function parseTrack(value: unknown, where: string): MotionSpecTrack {
  const track = expectRecord(value, where);
  const node = expectString(track.node, `${where}.node`);
  const property = expectString(track.property, `${where}.property`);
  const duration = expectRecord(track.duration, `${where}.duration`);
  const delay = expectRecord(track.delay, `${where}.delay`);
  if (!Array.isArray(track.keyframes) || track.keyframes.length < 2) {
    throw new Error(`${where}.keyframes: 키프레임이 둘 이상 있는 배열이어야 한다.`);
  }
  const easings = track.keyframes.slice(1).map((item: unknown, index) => {
    const keyframe = expectRecord(item, `${where}.keyframes[${String(index + 1)}]`);
    return expectString(keyframe.easing, `${where}.keyframes[${String(index + 1)}].easing`);
  });
  return {
    label: `${node} ${property}`,
    duration: {
      ms: expectNumber(duration.ms, `${where}.duration.ms`),
      token: expectString(duration.token, `${where}.duration.token`),
    },
    delay: {
      ms: expectNumber(delay.ms, `${where}.delay.ms`),
      token: delay.token === null ? null : expectString(delay.token, `${where}.delay.token`),
    },
    easings,
  };
}

/**
 * 객체인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 객체
 */
function expectRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: 객체여야 한다.`);
  }
  return Object.fromEntries(Object.entries(value));
}

/**
 * 문자열인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 문자열
 */
function expectString(value: unknown, where: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${where}: 문자열이어야 한다.`);
  }
  return value;
}

/**
 * 유한한 숫자인지 확인한다.
 * @param value 확인할 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 숫자
 */
function expectNumber(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${where}: 숫자여야 한다.`);
  }
  return value;
}
