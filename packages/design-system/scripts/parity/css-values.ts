/**
 * 브라우저 getComputedStyle 문자열을 비교할 수 있는 값으로 바꾸는 순수 함수다.
 */

/** 0~255 채널과 0~255 알파 */
export type Rgba = [number, number, number, number];

export type CssShadow = {
  color: Rgba;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  inset: boolean;
};

export type CssGradientStop = { color: Rgba; position: number | null };

const COLOR_PATTERN = /(rgba?\([^)]*\)|color\(srgb[^)]*\)|transparent)/gu;

/**
 * CSS 색 문자열(`rgb()`, `rgba()`, `color(srgb …)`, `transparent`, `#rrggbb[aa]`)을 RGBA로 바꾼다.
 * 채널은 0~255 정수로 반올림한다.
 * @param value CSS 색
 * @returns RGBA, 알 수 없는 형식이면 undefined
 */
export function parseColor(value: string): Rgba | undefined {
  const text = value.trim();
  if (text === 'transparent') {
    return [0, 0, 0, 0];
  }
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/iu.exec(text);
  if (hex !== null) {
    const [, r = '0', g = '0', b = '0', a = 'ff'] = hex;
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16)];
  }
  const rgb = /^rgba?\(([^)]*)\)$/u.exec(text);
  if (rgb !== null) {
    const parts = (rgb[1] ?? '')
      .split(/[\s,/]+/u)
      .filter(Boolean)
      .map(Number);
    const [r, g, b, a = 1] = parts;
    if ([r, g, b, a].some((part) => part === undefined || !Number.isFinite(part))) {
      return undefined;
    }
    return [round255(r ?? 0), round255(g ?? 0), round255(b ?? 0), Math.round(a * 255)];
  }
  const srgb = /^color\(srgb\s+([^)]*)\)$/u.exec(text);
  if (srgb !== null) {
    const parts = (srgb[1] ?? '')
      .split(/[\s/]+/u)
      .filter(Boolean)
      .map(Number);
    const [r = NaN, g = NaN, b = NaN, a = 1] = parts;
    if (![r, g, b, a].every(Number.isFinite)) {
      return undefined;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), Math.round(a * 255)];
  }
  return undefined;
}

/**
 * RGBA를 `#rrggbb` 또는 `#rrggbbaa`로 쓴다.
 * @param rgba RGBA
 * @returns 16진수 색
 */
export function formatColor(rgba: Rgba): string {
  const [r, g, b, a] = rgba;
  const channels = a === 255 ? [r, g, b] : [r, g, b, a];
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 두 색이 같은지 확인한다. 둘 다 완전히 투명하면 RGB와 상관없이 같다.
 * @param left 왼쪽 색
 * @param right 오른쪽 색
 * @returns 같으면 true
 */
export function sameColor(left: Rgba, right: Rgba): boolean {
  if (left[3] === 0 && right[3] === 0) {
    return true;
  }
  return left.every((channel, index) => channel === right[index]);
}

/**
 * 위에 있는 색을 아래 색 위에 일반 합성(source-over)한다.
 * @param top 위 색
 * @param bottom 아래 색
 * @returns 합성한 색
 */
export function compositeOver(top: Rgba, bottom: Rgba): Rgba {
  const ta = top[3] / 255;
  const ba = bottom[3] / 255;
  const alpha = ta + ba * (1 - ta);
  if (alpha === 0) {
    return [0, 0, 0, 0];
  }
  /**
   * 채널 하나를 합성한다.
   * @param index 채널(0 빨강, 1 초록, 2 파랑)
   * @returns 합성한 채널 값
   */
  function channel(index: 0 | 1 | 2): number {
    return Math.round((top[index] * ta + bottom[index] * ba * (1 - ta)) / alpha);
  }
  return [channel(0), channel(1), channel(2), Math.round(alpha * 255)];
}

/**
 * CSS 길이(`12px`)를 숫자로 바꾼다. `normal`·`none`·빈 값은 0이다.
 * @param value CSS 길이
 * @returns px
 */
export function parsePx(value: string): number {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * 모서리 반경 값(`4px` 또는 `4px 6px`)의 가로 반경을 읽는다.
 * @param value CSS 모서리 반경
 * @returns px
 */
export function parseRadius(value: string): number {
  return parsePx(value.trim().split(/\s+/u)[0] ?? '');
}

/**
 * `box-shadow`·`text-shadow` 값을 그림자 목록으로 바꾼다. 앞쪽이 위에 그려지는 그림자다.
 * @param value CSS 그림자 값(`none` 포함)
 * @returns 그림자 목록
 */
export function parseShadows(value: string): CssShadow[] {
  if (value.trim() === '' || value.trim() === 'none') {
    return [];
  }
  return splitTopLevel(value).map(parseShadow);
}

/**
 * 그림자 층 하나(`rgba(0, 0, 0, 0.14) 0px 8px 16px 0px [inset]`)를 읽는다.
 * @param layer 그림자 층
 * @returns 그림자
 */
function parseShadow(layer: string): CssShadow {
  {
    const color = layer.match(COLOR_PATTERN)?.[0] ?? 'rgba(0, 0, 0, 1)';
    const rest = layer.replace(color, ' ');
    const lengths = [...rest.matchAll(/(-?[\d.]+)px/gu)].map((match) => Number(match[1]));
    const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = lengths;
    return {
      color: parseColor(color) ?? [0, 0, 0, 255],
      offsetX,
      offsetY,
      blur,
      spread,
      inset: /\binset\b/u.test(rest),
    };
  }
}

/**
 * `filter`·`backdrop-filter` 값에서 `blur()` 반경을 읽는다.
 * @param value CSS 필터 값
 * @returns px, blur가 없으면 null
 */
export function parseBlur(value: string): number | null {
  const match = /blur\((-?[\d.]+)px\)/u.exec(value);
  return match === null ? null : Number(match[1]);
}

/**
 * `background-image`의 첫 선형 그라데이션 색 지점을 읽는다.
 * @param value CSS 배경 이미지 값
 * @returns 색 지점 목록, 그라데이션이 아니면 null
 */
export function parseGradientStops(value: string): CssGradientStop[] | null {
  const start = value.indexOf('linear-gradient(');
  if (start < 0) {
    return null;
  }
  const stops: CssGradientStop[] = [];
  const pattern = /(rgba?\([^)]*\)|color\(srgb[^)]*\)|transparent)\s*(-?[\d.]+%)?/gu;
  for (const match of value.slice(start).matchAll(pattern)) {
    const color = parseColor(match[1] ?? '');
    if (color !== undefined) {
      stops.push({ color, position: match[2] === undefined ? null : parseFloat(match[2]) });
    }
  }
  return stops;
}

/**
 * `background-image`에서 `url()` 주소를 모두 읽는다.
 * @param value CSS 배경 이미지 값
 * @returns 주소 목록
 */
export function parseUrls(value: string): string[] {
  return [...value.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gu)].map((match) => match[2] ?? '');
}

/**
 * 괄호 밖의 쉼표로 나눈다.
 * @param value CSS 값
 * @returns 나눈 값
 */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() !== '') {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * 0~255 범위 숫자를 정수로 반올림한다.
 * @param value 채널 값
 * @returns 정수 채널
 */
function round255(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 255));
}
