/**
 * 모션 스토리에서 읽은 애니메이션(`getAnimations()`)을 json의 토큰 짝과 비교한다. 파일과 브라우저를 모르는 순수 함수다.
 * 토큰 값은 figma/tokens.json(DTCG)에서 읽는다. tokens.css는 이 파일에서 생성되고 CI가 같은지 검사한다.
 */

import type { MotionSpec } from './motion-spec.ts';
import { storyEntries } from './story-target.ts';

/** 브라우저에서 읽은 CSS 애니메이션 하나 */
export type ObservedAnimation = {
  /** `animation-name` */
  name: string;
  /** 애니메이션이 걸린 요소 설명(메시지용) */
  target: string;
  /** ms */
  duration: number;
  /** ms */
  delay: number;
  /** 반복 횟수. 무한이면 `infinite` */
  iterations: number | 'infinite';
  /** 끝(offset 1)을 뺀 키프레임마다의 이징(다음 키프레임까지 움직이는 곡선) */
  easings: string[];
};

/** cubic-bezier 네 점 */
type Bezier = readonly [number, number, number, number];

/** 모션 스토리 제목 앞부분 */
export const MOTION_TITLE_PREFIX = 'Motion/';

// 같은 시간으로 보는 차이(ms)와 같은 곡선으로 보는 차이다.
const TIME_TOLERANCE_MS = 0.5;
const CURVE_TOLERANCE = 1e-3;
const MS_PER_SECOND = 1000;

// CSS 이징 키워드의 곡선이다(CSS Easing Functions Level 1).
const keywordCurves: ReadonlyMap<string, Bezier> = new Map<string, Bezier>([
  ['linear', [0, 0, 1, 1]],
  ['ease', [0.25, 0.1, 0.25, 1]],
  ['ease-in', [0.42, 0, 1, 1]],
  ['ease-out', [0, 0, 0.58, 1]],
  ['ease-in-out', [0.42, 0, 0.58, 1]],
]);
const CUBIC_BEZIER_PATTERN = /^cubic-bezier\(([^)]*)\)$/u;

/**
 * 모션 스토리의 애니메이션 시간·이징·지연·반복 횟수가 json의 토큰 짝과 같은지 비교한다.
 * 트랙과 CSS 애니메이션을 하나씩 짝짓지 않고(항목 → CSS 속성 변환표가 필요하다), 쓰인 값의 모음을 양쪽에서 비교한다.
 * - 시간: CSS 애니메이션 시간 모음과 json 트랙 길이 토큰 값 모음이 같아야 한다.
 * - 지연: CSS 지연 모음과 json 시작 지연 토큰 값(없으면 0) 모음이 같아야 한다.
 * - 이징: CSS 키프레임 이징 모음과 json 이징 토큰 곡선 모음이 같아야 한다.
 * - 반복: json에 반복 횟수가 있으면 모든 CSS 애니메이션이 같아야 한다. 피그마에서 알 수 없으면(null) 검사하지 않는다.
 * @codocs [[피그마 연동:모션]]
 * @param spec json 값
 * @param tokens figma/tokens.json을 파싱한 값
 * @param observed 모션 스토리에서 읽은 CSS 애니메이션
 * @returns 오류 메시지(같으면 빈 목록)
 */
export function compareMotion(
  spec: MotionSpec,
  tokens: unknown,
  observed: readonly ObservedAnimation[],
): string[] {
  const errors: string[] = [];
  if (observed.length === 0) {
    return [
      `Motion/${spec.name} 스토리에서 재생 중인 CSS 애니메이션을 찾지 못했다. 스토리가 ${spec.name} 클래스를 걸었는지 확인한다.`,
    ];
  }
  const durations: number[] = [];
  const delays: number[] = [];
  const easings: { token: string; curve: Bezier }[] = [];
  for (const track of spec.tracks) {
    const duration = tokenDuration(tokens, track.duration.token);
    if (duration === null) {
      errors.push(
        `${track.label}: 시간 토큰 ${track.duration.token}을 tokens.json에서 찾지 못했다.`,
      );
    } else {
      if (!isSameTime(duration, track.duration.ms)) {
        errors.push(
          `${track.label}: json의 트랙 길이 ${String(track.duration.ms)}ms가 지금 토큰 ${track.duration.token} 값 ${String(duration)}ms와 다르다. 피그마에서 다시 내보낸다.`,
        );
      }
      durations.push(duration);
    }
    if (track.delay.token === null) {
      delays.push(0);
    } else {
      const delay = tokenDuration(tokens, track.delay.token);
      if (delay === null) {
        errors.push(
          `${track.label}: 지연 토큰 ${track.delay.token}을 tokens.json에서 찾지 못했다.`,
        );
      } else {
        delays.push(delay);
      }
    }
    for (const token of track.easings) {
      const curve = tokenCurve(tokens, token);
      if (curve === null) {
        errors.push(`${track.label}: 이징 토큰 ${token}을 tokens.json에서 찾지 못했다.`);
      } else {
        easings.push({ token, curve });
      }
    }
  }

  errors.push(
    ...compareTimes(
      '시간',
      observed.map((animation) => animation.duration),
      durations,
    ),
    ...compareTimes(
      '지연',
      observed.map((animation) => animation.delay),
      delays,
    ),
    ...compareEasings(observed, easings),
  );
  if (spec.iterations !== null) {
    const expected = spec.iterations;
    for (const animation of observed.filter((item) => item.iterations !== expected)) {
      errors.push(
        `${animationLabel(animation)}: 반복 횟수 ${String(animation.iterations)}가 json의 ${String(expected)}와 다르다.`,
      );
    }
  }
  return errors;
}

/**
 * 반복 횟수를 사람이 보도록 요약한다. json에 반복이 없을 때(피그마에서 알 수 없음) 로그에 남긴다.
 * @param observed 모션 스토리에서 읽은 CSS 애니메이션
 * @returns `motion-x: infinite` 꼴의 요약
 */
export function iterationSummary(observed: readonly ObservedAnimation[]): string {
  return observed
    .map((animation) => `${animationLabel(animation)}: ${String(animation.iterations)}`)
    .join(', ');
}

/**
 * Storybook index.json에서 제목이 `Motion/<이름>`인 스토리를 찾는다. 여럿이면 첫 스토리다.
 * @codocs [[피그마 연동:모션]]
 * @param index storybook-static/index.json을 파싱한 값
 * @param name 견본 이름
 * @returns 스토리 ID, 또는 찾지 못한 이유
 */
export function findMotionStoryId(
  index: unknown,
  name: string,
): { ok: true; id: string } | { ok: false; message: string } {
  const title = `${MOTION_TITLE_PREFIX}${name}`;
  const found = storyEntries(index).find((entry) => entry.title === title);
  return found === undefined
    ? {
        ok: false,
        message: `스토리가 없다: 디자인 시스템 Storybook에 제목이 "${title}"인 모션 스토리를 만든다`,
      }
    : { ok: true, id: found.id };
}

/**
 * CSS 이징 글자를 cubic-bezier 네 점으로 바꾼다.
 * @param text `linear`, `ease-out`, `cubic-bezier(0, 0, 0, 1)` 등
 * @returns 네 점, 곡선이 아니면(steps 등) null
 */
export function parseEasing(text: string): Bezier | null {
  const trimmed = text.trim();
  const keyword = keywordCurves.get(trimmed);
  if (keyword !== undefined) {
    return keyword;
  }
  const inner = CUBIC_BEZIER_PATTERN.exec(trimmed)?.[1];
  if (inner === undefined) {
    return null;
  }
  const numbers = inner.split(',').map((part) => Number(part.trim()));
  const [x1, y1, x2, y2] = numbers;
  if (
    numbers.length !== 4 ||
    x1 === undefined ||
    y1 === undefined ||
    x2 === undefined ||
    y2 === undefined ||
    numbers.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  return [x1, y1, x2, y2];
}

/**
 * 두 시간 모음을 비교한다. 한쪽에만 있는 값을 알린다.
 * @param label 메시지 이름(`시간`, `지연`)
 * @param observed CSS 값(ms)
 * @param expected json 토큰 값(ms)
 * @returns 오류 메시지
 */
function compareTimes(
  label: string,
  observed: readonly number[],
  expected: readonly number[],
): string[] {
  const errors: string[] = [];
  const onlyObserved = unique(observed).filter(
    (value) => !expected.some((item) => isSameTime(item, value)),
  );
  const onlyExpected = unique(expected).filter(
    (value) => !observed.some((item) => isSameTime(item, value)),
  );
  if (onlyObserved.length > 0) {
    errors.push(
      `CSS 애니메이션 ${label} ${onlyObserved.map(msText).join(', ')}가 json의 토큰 값(${unique(expected).map(msText).join(', ')})에 없다.`,
    );
  }
  if (onlyExpected.length > 0) {
    errors.push(
      `json의 ${label} 토큰 값 ${onlyExpected.map(msText).join(', ')}를 쓰는 CSS 애니메이션이 없다(CSS: ${unique(observed).map(msText).join(', ')}).`,
    );
  }
  return errors;
}

/**
 * CSS 키프레임 이징 모음과 json 이징 토큰 곡선 모음을 비교한다.
 * @param observed CSS 애니메이션
 * @param expected json 이징 토큰과 곡선
 * @returns 오류 메시지
 */
function compareEasings(
  observed: readonly ObservedAnimation[],
  expected: readonly { token: string; curve: Bezier }[],
): string[] {
  const errors: string[] = [];
  const used = observed.flatMap(usedEasings);
  for (const item of used) {
    const { curve } = item;
    if (curve === null) {
      errors.push(`${item.where}: 이징 ${item.text}는 곡선이 아니라 토큰과 비교할 수 없다.`);
    } else if (!expected.some((entry) => isSameCurve(entry.curve, curve))) {
      errors.push(
        `${item.where}: 이징 ${item.text}가 json의 이징 토큰(${uniqueText(expected.map((entry) => entry.token)).join(', ')})에 없다.`,
      );
    }
  }
  for (const token of uniqueText(expected.map((entry) => entry.token))) {
    const curve = expected.find((entry) => entry.token === token)?.curve;
    if (
      curve !== undefined &&
      !used.some((item) => item.curve !== null && isSameCurve(item.curve, curve))
    ) {
      errors.push(`json의 이징 토큰 ${token}(${curve.join(', ')})을 쓰는 CSS 키프레임이 없다.`);
    }
  }
  return errors;
}

/**
 * CSS 애니메이션 하나의 키프레임 이징을 곡선과 함께 꺼낸다.
 * @param animation CSS 애니메이션
 * @returns 이징 글자, 곡선(곡선이 아니면 null), 메시지 위치
 */
function usedEasings(
  animation: ObservedAnimation,
): { text: string; curve: Bezier | null; where: string }[] {
  const where = animationLabel(animation);
  return animation.easings.map((text) => ({ text, curve: parseEasing(text), where }));
}

/**
 * tokens.json에서 시간 토큰 값을 ms로 읽는다. 별칭(`{motion.duration.fast}`)은 따라간다.
 * @param tokens tokens.json을 파싱한 값
 * @param name 피그마 변수 이름(`motion/duration/fast`)
 * @returns ms, 없거나 시간이 아니면 null
 */
export function tokenDuration(tokens: unknown, name: string): number | null {
  const value = tokenValue(tokens, name.split('/'));
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const amount: unknown = Reflect.get(value, 'value');
  const unit: unknown = Reflect.get(value, 'unit');
  if (typeof amount !== 'number') {
    return null;
  }
  if (unit === 'ms') {
    return amount;
  }
  return unit === 's' ? amount * MS_PER_SECOND : null;
}

/**
 * tokens.json에서 이징 토큰 곡선을 읽는다.
 * @param tokens tokens.json을 파싱한 값
 * @param name 피그마 변수 이름(`motion/easing/fade`)
 * @returns 네 점, 없으면 null
 */
export function tokenCurve(tokens: unknown, name: string): Bezier | null {
  const value = tokenValue(tokens, name.split('/'));
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }
  const points: unknown[] = value;
  const [x1, y1, x2, y2] = points;
  return typeof x1 === 'number' &&
    typeof y1 === 'number' &&
    typeof x2 === 'number' &&
    typeof y2 === 'number'
    ? [x1, y1, x2, y2]
    : null;
}

// 별칭을 따라가는 최대 단계다.
const MAX_ALIAS_DEPTH = 10;
const ALIAS_PATTERN = /^\{([^}]+)\}$/u;

/**
 * DTCG 토큰의 `$value`를 경로로 찾는다. 별칭은 따라간다. 그룹 이름과 겹친 토큰은 `$root`에 있다.
 * @param tokens tokens.json을 파싱한 값
 * @param path 경로 조각
 * @returns `$value`, 없으면 undefined
 */
function tokenValue(tokens: unknown, path: readonly string[]): unknown {
  let current = path;
  for (let depth = 0; depth < MAX_ALIAS_DEPTH; depth += 1) {
    let node: unknown = tokens;
    for (const key of current) {
      node = typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined;
    }
    if (typeof node === 'object' && node !== null && !('$value' in node) && '$root' in node) {
      node = Reflect.get(node, '$root');
    }
    const value: unknown =
      typeof node === 'object' && node !== null ? Reflect.get(node, '$value') : undefined;
    const alias = typeof value === 'string' ? ALIAS_PATTERN.exec(value)?.[1] : undefined;
    if (alias === undefined) {
      return value;
    }
    current = alias.split('.');
  }
  return undefined;
}

/**
 * 두 시간이 같은지 본다.
 * @param left ms
 * @param right ms
 * @returns 차이가 허용 범위 안이면 true
 */
function isSameTime(left: number, right: number): boolean {
  return Math.abs(left - right) <= TIME_TOLERANCE_MS;
}

/**
 * 두 곡선이 같은지 본다.
 * @param left 네 점
 * @param right 네 점
 * @returns 모든 점의 차이가 허용 범위 안이면 true
 */
function isSameCurve(left: Bezier, right: Bezier): boolean {
  return left.every(
    (value, index) => Math.abs(value - (right[index] ?? Number.NaN)) <= CURVE_TOLERANCE,
  );
}

/**
 * 같은 시간을 하나로 줄이고 정렬한다.
 * @param values ms
 * @returns 정렬한 값
 */
function unique(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * 같은 글자를 하나로 줄이고 정렬한다.
 * @param values 글자
 * @returns 정렬한 값
 */
function uniqueText(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * 메시지에 쓰는 애니메이션 이름을 만든다.
 * @param animation CSS 애니메이션
 * @returns `<요소> <animation-name>`
 */
function animationLabel(animation: ObservedAnimation): string {
  return `${animation.target} ${animation.name}`;
}

/**
 * ms 값을 글로 만든다.
 * @param value ms
 * @returns `250ms`
 */
function msText(value: number): string {
  return `${String(value)}ms`;
}
