/**
 * 피그마 값과 CSS 값을 같은 모양으로 바꿔 비교한다. 판단이 아니라 단위 변환이다.
 * 규칙은 [[피그마 일치 검사:판정 항목]]의 "값 변환"에 있다.
 * 브라우저로 넘기는 함수가 없어 Node와 테스트에서만 쓴다.
 */

/** 기대값 하나 */
export type Expected =
  | { kind: 'color'; rgba: Rgba }
  | { kind: 'length'; px: number }
  | { kind: 'number'; value: number }
  | { kind: 'ms'; value: number }
  | { kind: 'bezier'; points: readonly [number, number, number, number] }
  | { kind: 'angle'; deg: number }
  | { kind: 'keywords'; values: readonly string[] };

/** 0–255 정수 채널과 0–255 정수 투명도 */
export type Rgba = readonly [number, number, number, number];

/** 그림자 층 하나(판정하지 않고 캡처 여백을 정할 때만 쓴다) */
export type ShadowLayer = {
  rgba: Rgba;
  x: number;
  y: number;
  blur: number;
  spread: number;
  inset: boolean;
};

// 부동소수 표현 차이만 없애는 자릿수다(소수 셋째 자리).
const LENGTH_DIGITS = 3;

// CSS 이징 이름의 베지어 값이다.
const cssEasings: Readonly<Record<string, readonly [number, number, number, number]>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/**
 * 계산값이 기대값과 같은지 본다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param expected 기대값
 * @param actual 계산값
 * @returns 같으면 true
 */
export function matchesExpected(expected: Expected, actual: string): boolean {
  const value = actual.trim();
  switch (expected.kind) {
    case 'color': {
      const rgba = parseColor(value);
      return rgba !== null && sameRgba(rgba, expected.rgba);
    }
    case 'length': {
      const px = parseLength(value);
      return px !== null && round(px) === round(expected.px);
    }
    case 'number': {
      const number = Number.parseFloat(value);
      return Number.isFinite(number) && round(number) === round(expected.value);
    }
    case 'ms': {
      const ms = parseDuration(value);
      return ms !== null && round(ms) === round(expected.value);
    }
    case 'bezier': {
      const points = parseEasing(value);
      return (
        points !== null &&
        points.every((point, index) => round(point) === round(expected.points[index] ?? NaN))
      );
    }
    case 'angle':
      return sameAngle(value, expected.deg);
    case 'keywords':
      return expected.values.includes(value);
  }
}

/**
 * 실패 메시지에 쓸 기대값 표기.
 * @param expected 기대값
 * @returns CSS 모양의 값
 */
export function describeExpected(expected: Expected): string {
  switch (expected.kind) {
    case 'color':
      return rgbaCss(expected.rgba);
    case 'length':
      return `${String(round(expected.px))}px`;
    case 'number':
      return String(round(expected.value));
    case 'ms':
      return `${String(round(expected.value))}ms`;
    case 'bezier':
      return `cubic-bezier(${expected.points.map((point) => String(round(point))).join(', ')})`;
    case 'angle':
      return `${String(expected.deg)}deg`;
    case 'keywords':
      return expected.values.join(' | ');
  }
}

/**
 * 피그마 색(`#rrggbb`, `#rrggbbaa`)을 채널로 바꾼다.
 * @param hex 피그마 색
 * @returns 채널, 읽을 수 없으면 null
 */
export function parseHex(hex: string): Rgba | null {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.exec(hex.trim());
  if (match?.[1] === undefined) {
    return null;
  }
  let digits = match[1];
  if (digits.length <= 4) {
    digits = digits.replace(/[0-9a-f]/giu, (digit) => digit + digit);
  }
  const channels = [0, 2, 4, 6].map((index) => Number.parseInt(digits.slice(index, index + 2), 16));
  const [r = 0, g = 0, b = 0, a = 255] = channels;
  return [r, g, b, digits.length === 8 ? a : 255];
}

/**
 * CSS 색 값을 채널로 바꾼다. 계산값 모양(`rgb()`, `rgba()`, `color(srgb …)`)과 `#hex`, `transparent`를 읽는다.
 * @param css CSS 색
 * @returns 채널, 읽을 수 없으면 null
 */
export function parseColor(css: string): Rgba | null {
  const value = css.trim().toLowerCase();
  if (value === 'transparent') {
    return [0, 0, 0, 0];
  }
  if (value.startsWith('#')) {
    return parseHex(value);
  }
  const rgb = /^rgba?\(([^)]*)\)$/u.exec(value);
  if (rgb?.[1] !== undefined) {
    const parts = rgb[1].split(/[\s,/]+/u).filter((part) => part !== '');
    const [r, g, b, a] = parts;
    if (r === undefined || g === undefined || b === undefined) {
      return null;
    }
    return [
      Math.round(channelNumber(r, 255)),
      Math.round(channelNumber(g, 255)),
      Math.round(channelNumber(b, 255)),
      Math.round(a === undefined ? 255 : channelNumber(a, 1) * 255),
    ];
  }
  const srgb = /^color\(srgb ([^)]*)\)$/u.exec(value);
  if (srgb?.[1] !== undefined) {
    const parts = srgb[1].split(/[\s/]+/u).filter((part) => part !== '');
    const [r, g, b, a] = parts.map((part) => channelNumber(part, 1));
    if (r === undefined || g === undefined || b === undefined) {
      return null;
    }
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      Math.round((a ?? 1) * 255),
    ];
  }
  return null;
}

/**
 * 채널 숫자를 읽는다. `%`면 최댓값의 백분율이다.
 * @param part 채널 글자
 * @param max 100%에 해당하는 값
 * @returns 숫자
 */
function channelNumber(part: string, max: number): number {
  return part.endsWith('%') ? (Number.parseFloat(part) / 100) * max : Number.parseFloat(part);
}

/**
 * 두 색이 같은지 본다. 채널과 투명도를 0–255 정수로 비교한다.
 * @param a 색
 * @param b 색
 * @returns 같으면 true
 */
export function sameRgba(a: Rgba, b: Rgba): boolean {
  // 투명도가 0이면 채널은 보이지 않으므로 비교하지 않는다.
  if (a[3] === 0 && b[3] === 0) {
    return true;
  }
  return a.every((channel, index) => channel === b[index]);
}

/**
 * 채널을 CSS 색 표기로 쓴다.
 * @param rgba 채널
 * @returns `rgb()`나 `rgba()`
 */
export function rgbaCss(rgba: Rgba): string {
  const [r, g, b, a] = rgba;
  return a === 255
    ? `rgb(${String(r)}, ${String(g)}, ${String(b)})`
    : `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(round(a / 255))})`;
}

/**
 * 길이 값을 px로 읽는다. 0은 단위가 없어도 된다.
 * @param css `12px`, `0`
 * @returns px, 읽을 수 없으면 null
 */
export function parseLength(css: string): number | null {
  const value = css.trim();
  if (value === '0') {
    return 0;
  }
  const match = /^(-?[\d.]+(?:e-?\d+)?)px$/u.exec(value);
  return match?.[1] === undefined ? null : Number.parseFloat(match[1]);
}

/**
 * 시간 값을 ms로 읽는다.
 * @param css `0.083s`, `83ms`
 * @returns ms, 읽을 수 없으면 null
 */
export function parseDuration(css: string): number | null {
  const match = /^(-?[\d.]+(?:e-?\d+)?)(ms|s)$/u.exec(css.trim());
  if (match?.[1] === undefined) {
    return null;
  }
  const number = Number.parseFloat(match[1]);
  return match[2] === 's' ? number * 1000 : number;
}

/**
 * 이징 값을 베지어 네 값으로 읽는다.
 * @param css `cubic-bezier(0, 0, 1, 1)`, `linear`, `ease`
 * @returns 네 값, 읽을 수 없으면 null
 */
export function parseEasing(css: string): readonly [number, number, number, number] | null {
  const value = css.trim();
  const named = cssEasings[value];
  if (named !== undefined) {
    return named;
  }
  const match = /^cubic-bezier\(([^)]*)\)$/u.exec(value);
  const numbers = match?.[1]?.split(',').map((part) => Number.parseFloat(part));
  if (numbers?.length !== 4 || numbers.some((number) => !Number.isFinite(number))) {
    return null;
  }
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = numbers;
  return [x1, y1, x2, y2];
}

/**
 * 계산값의 회전이 기대 각도(시계 방향 양수)와 같은지 본다. `rotate` 속성(`90deg`)과 `transform` 행렬을 모두 읽는다.
 * @param css `rotate`·`transform` 계산값을 `|`로 이은 값(`90deg|none`)
 * @param deg 기대 각도
 * @returns 같으면 true
 */
function sameAngle(css: string, deg: number): boolean {
  const [rotate = 'none', transform = 'none'] = css.split('|');
  let total = 0;
  if (rotate !== 'none') {
    const match = /^(-?[\d.]+)deg$/u.exec(rotate.trim());
    if (match?.[1] === undefined) {
      return false;
    }
    total += Number.parseFloat(match[1]);
  }
  if (transform !== 'none') {
    const match = /^matrix\(([^)]*)\)$/u.exec(transform.trim());
    const [a, b] = match?.[1]?.split(',').map((part) => Number.parseFloat(part)) ?? [];
    if (a === undefined || b === undefined) {
      return false;
    }
    total += (Math.atan2(b, a) * 180) / Math.PI;
  }
  return normalizeAngle(total) === normalizeAngle(deg);
}

/**
 * 각도를 0–359 정수로 바꾼다.
 * @param angle 각도
 * @returns 0–359 정수
 */
function normalizeAngle(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360;
}

/**
 * 괄호 밖의 쉼표로 나눈다.
 * @param value 목록 값
 * @returns 항목
 */
export function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim() !== '') {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * 소수 셋째 자리에서 반올림한다.
 * @param value 숫자
 * @returns 반올림한 숫자
 */
export function round(value: number): number {
  const factor = 10 ** LENGTH_DIGITS;
  return Math.round(value * factor) / factor;
}
