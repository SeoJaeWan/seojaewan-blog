import type {
  LayerMeasure,
  MeasuredPaint,
  MeasuredShadow,
  MeasuredStroke,
  Rgba255,
} from '../figma-export/component-layout';
import type { LayerKey } from '../figma-export/layer-key';

// 피그마가 계산한 레이어 값(검증 자료)과 브라우저가 계산한 값을 견준다. 브라우저에서 읽는 일은 measure-layer.ts가 하고,
// 여기는 읽은 값을 견주기만 해서 브라우저 없이 시험한다.

/** 자리와 크기의 허용 오차(px). 반올림 차이만 받는다([[디자인 시스템:생성 결과 검증]]) */
export const RECT_TOLERANCE = 0.02;

/** 색 채널(0~255)의 허용 오차. 토큰 색이 8비트 16진수라 생기는 반올림만 받는다 */
export const COLOR_TOLERANCE = 1;

/** 불투명도·글자 값의 허용 오차 */
const NUMBER_TOLERANCE = 0.005;

/** 그라데이션 정지점 위치(0~1)의 허용 오차. tokens.css가 위치를 소수 셋째 자리 백분율로 쓴다 */
const STOP_TOLERANCE = 0.0001;

/** 네 변 */
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** 네 모서리 */
const CORNERS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;

/** 브라우저 색(0~255, 투명도는 0~1) */
export type CssColor = { r: number; g: number; b: number; a: number };

/**
 * 브라우저가 계산한 요소 하나의 값. `getBoundingClientRect`와 `getComputedStyle`에서 읽는다.
 * - rect: 스토리 루트 기준 자리와 크기
 * - ring: 안쪽 선 고리(`::before`)의 값
 * - asset: 자산 SVG의 viewBox와 첫 요소의 `d`. 이미지 자산은 파일 주소
 */
export type ObservedLayer = {
  rect: { x: number; y: number; width: number; height: number };
  opacity: number;
  backgroundColor: string;
  backgroundImage: string;
  color: string;
  border: Record<(typeof SIDES)[number], { width: number; color: string }>;
  outline: { style: string; width: number; color: string; offset: number };
  ring: { content: string; width: number; backgroundColor: string; backgroundImage: string };
  radius: Record<(typeof CORNERS)[number], number>;
  boxShadow: string;
  textShadow: string;
  fontSize: number;
  lineHeight: string;
  fontWeight: number;
  objectFit: string;
  asset: { viewBox: string | null; firstPath: string | null; src: string | null } | null;
};

/** 자산 원본에서 기대하는 SVG 모양이나 이미지 주소 */
export type ExpectedAsset = {
  viewBox: string | null;
  firstPath: string | null;
  src: string | null;
};

/**
 * 다른 값 하나.
 * - layer: 레이어 키
 * - field: 다른 항목(`x`, `fills[0]`, `stroke.weight.top`)
 */
export type Mismatch = { layer: LayerKey; field: string; expected: string; actual: string };

/**
 * 견줄 때의 조건.
 * - ignored: 견주지 않는 항목. 자리·크기 이름이거나, 모습 전체(칠·선·모서리·그림자)를 뜻하는 `look`이다
 * - assetOf: 자산 파일 이름에서 기대하는 SVG 모양을 찾는다
 */
export type CompareOptions = {
  ignored: ReadonlySet<string>;
  assetOf: (file: string) => ExpectedAsset | undefined;
};

/**
 * 레이어 하나의 피그마 값과 브라우저 값을 견준다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param layer 레이어 키
 * @param expected 검증 자료의 값
 * @param observed 브라우저가 계산한 값
 * @param options 견줄 때의 조건
 * @returns 다른 값
 */
export function compareLayer(
  layer: LayerKey,
  expected: LayerMeasure,
  observed: ObservedLayer,
  options: CompareOptions,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  /**
   * 다른 값을 더한다.
   * @param field 항목
   * @param expectedText 피그마 값
   * @param actualText 브라우저 값
   */
  function add(field: string, expectedText: string, actualText: string): void {
    mismatches.push({ layer, field, expected: expectedText, actual: actualText });
  }
  for (const field of ['x', 'y', 'width', 'height'] as const) {
    if (
      !options.ignored.has(field) &&
      !isClose(expected[field], observed.rect[field], RECT_TOLERANCE)
    ) {
      add(field, formatPx(expected[field]), formatPx(observed.rect[field]));
    }
  }
  if (!isClose(expected.opacity, observed.opacity, NUMBER_TOLERANCE)) {
    add('opacity', String(expected.opacity), String(observed.opacity));
  }
  if (options.ignored.has('look')) {
    return mismatches;
  }
  if (expected.asset !== null) {
    compareAsset(expected.asset, observed, options, add);
  } else if (expected.text !== null) {
    compareTextFill(expected.fills, observed, add);
    compareText(expected.text, observed, add);
  } else {
    compareFills(expected.fills, observed, add);
  }
  if (expected.asset === null) {
    compareStroke(expected.stroke, observed, add);
  }
  if (expected.cornerRadius !== null) {
    for (const corner of CORNERS) {
      if (!isClose(expected.cornerRadius[corner], observed.radius[corner], RECT_TOLERANCE)) {
        add(
          `cornerRadius.${corner}`,
          formatPx(expected.cornerRadius[corner]),
          formatPx(observed.radius[corner]),
        );
      }
    }
  }
  compareShadows(
    expected.shadows,
    expected.text === null ? observed.boxShadow : observed.textShadow,
    add,
  );
  return mismatches;
}

/**
 * 틀의 칠을 견준다. 단색은 배경색, 그라데이션은 배경 그림의 색 단계, 이미지는 맞춤 방식이다.
 * @param fills 피그마 칠
 * @param observed 브라우저 값
 * @param add 다른 값을 더한다
 */
function compareFills(
  fills: readonly MeasuredPaint[],
  observed: ObservedLayer,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const solid = fills.find((paint) => paint.type === 'SOLID');
  const gradient = fills.find(
    (paint): paint is Extract<MeasuredPaint, { stops: unknown }> => 'stops' in paint,
  );
  const image = fills.find((paint) => paint.type === 'IMAGE');
  const background = parseColor(observed.backgroundColor);
  if (solid === undefined) {
    if (background !== null && background.a > 0) {
      add('fills', '배경색 없음', observed.backgroundColor);
    }
  } else if (!isSameColor(paintColor(solid.color, solid.opacity), background)) {
    add(
      'fills[SOLID]',
      formatColor(paintColor(solid.color, solid.opacity)),
      observed.backgroundColor,
    );
  }
  if (gradient === undefined) {
    if (observed.backgroundImage !== 'none' && image === undefined) {
      add('fills', '배경 그림 없음', observed.backgroundImage);
    }
  } else {
    compareStops('fills[GRADIENT]', gradient, observed.backgroundImage, add);
  }
  if (image !== undefined && image.fit !== observed.objectFit) {
    add('fills[IMAGE].fit', image.fit, observed.objectFit);
  }
}

/**
 * 글자색을 견준다.
 * @param fills 글자 레이어의 칠
 * @param observed 브라우저 값
 * @param add 다른 값을 더한다
 */
function compareTextFill(
  fills: readonly MeasuredPaint[],
  observed: ObservedLayer,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const solid = fills.find((paint) => paint.type === 'SOLID');
  if (solid === undefined) {
    return;
  }
  const expected = paintColor(solid.color, solid.opacity);
  if (!isSameColor(expected, parseColor(observed.color))) {
    add('fills[SOLID](글자색)', formatColor(expected), observed.color);
  }
}

/**
 * 글자 크기, 줄 높이, 굵기를 견준다. 줄 높이 `AUTO`는 피그마가 숫자를 주지 않아 견주지 않는다.
 * @param text 피그마 글자 값
 * @param observed 브라우저 값
 * @param add 다른 값을 더한다
 */
function compareText(
  text: NonNullable<LayerMeasure['text']>,
  observed: ObservedLayer,
  add: (field: string, expected: string, actual: string) => void,
): void {
  if (!isClose(text.fontSize, observed.fontSize, NUMBER_TOLERANCE)) {
    add('text.fontSize', formatPx(text.fontSize), formatPx(observed.fontSize));
  }
  if (text.fontWeight !== observed.fontWeight) {
    add('text.fontWeight', String(text.fontWeight), String(observed.fontWeight));
  }
  if (text.lineHeight.unit !== 'AUTO') {
    const expected =
      text.lineHeight.unit === 'PIXELS'
        ? text.lineHeight.value
        : (text.fontSize * text.lineHeight.value) / 100;
    const actual = Number.parseFloat(observed.lineHeight);
    if (!isClose(expected, actual, NUMBER_TOLERANCE)) {
      add('text.lineHeight', formatPx(expected), observed.lineHeight);
    }
  }
}

/**
 * 자산이 어느 자산인지, 색을 견준다. 자산 안쪽 그림은 견주지 않는다.
 * @param asset 피그마 자산 값
 * @param observed 브라우저 값
 * @param options 견줄 때의 조건
 * @param add 다른 값을 더한다
 */
function compareAsset(
  asset: NonNullable<LayerMeasure['asset']>,
  observed: ObservedLayer,
  options: CompareOptions,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const expected = options.assetOf(asset.file);
  if (expected === undefined) {
    add('asset.file', asset.file, '자산 데이터에 없음');
  } else if (observed.asset === null) {
    add('asset.file', asset.file, '자산 요소가 아님');
  } else if (
    expected.viewBox !== observed.asset.viewBox ||
    expected.firstPath !== observed.asset.firstPath ||
    (expected.src !== null && observed.asset.src?.endsWith(expected.src) !== true)
  ) {
    add('asset.file', asset.file, observed.asset.src ?? observed.asset.viewBox ?? '알 수 없음');
  }
  if (
    asset.color !== null &&
    !isSameColor(paintColor(asset.color, 1), parseColor(observed.color))
  ) {
    add('asset.color', formatColor(paintColor(asset.color, 1)), observed.color);
  }
}

/**
 * 선을 견준다. 안쪽 선은 테두리가 있으면 테두리, 없으면 `::before` 고리와 견주고, 바깥·가운데 선은 outline과 견준다.
 * @param stroke 피그마 선
 * @param observed 브라우저 값
 * @param add 다른 값을 더한다
 */
function compareStroke(
  stroke: MeasuredStroke | null,
  observed: ObservedLayer,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const hasBorder = SIDES.some((side) => observed.border[side].width > 0);
  const hasRing = observed.ring.content !== 'none' && observed.ring.content !== 'normal';
  const hasOutline = observed.outline.style !== 'none' && observed.outline.width > 0;
  if (stroke === null) {
    if (hasBorder || hasRing || hasOutline) {
      add('stroke', '선 없음', hasBorder ? '테두리' : hasRing ? '안쪽 선 고리' : '바깥 선');
    }
    return;
  }
  const [paint] = stroke.paints;
  if (stroke.align === 'INSIDE' && hasBorder) {
    for (const side of SIDES) {
      const width = observed.border[side].width;
      if (!isClose(stroke.weight[side], width, RECT_TOLERANCE)) {
        add(`stroke.weight.${side}`, formatPx(stroke.weight[side]), formatPx(width));
      }
      if (stroke.weight[side] > 0 && paint?.type === 'SOLID') {
        const color = paintColor(paint.color, paint.opacity);
        if (!isSameColor(color, parseColor(observed.border[side].color))) {
          add(`stroke.paints[0](${side})`, formatColor(color), observed.border[side].color);
        }
      }
    }
    return;
  }
  if (stroke.align === 'INSIDE') {
    if (!hasRing) {
      add('stroke', '안쪽 선', '선 없음');
      return;
    }
    compareUniformWeight(stroke, observed.ring.width, add);
    comparePaint(paint, observed.ring.backgroundColor, observed.ring.backgroundImage, add);
    return;
  }
  if (!hasOutline) {
    add('stroke', stroke.align === 'OUTSIDE' ? '바깥 선' : '가운데 선', '선 없음');
    return;
  }
  compareUniformWeight(stroke, observed.outline.width, add);
  if (
    stroke.align === 'CENTER' &&
    !isClose(-stroke.weight.top / 2, observed.outline.offset, RECT_TOLERANCE)
  ) {
    add('stroke.align', formatPx(-stroke.weight.top / 2), formatPx(observed.outline.offset));
  }
  if (paint?.type === 'SOLID') {
    const color = paintColor(paint.color, paint.opacity);
    if (!isSameColor(color, parseColor(observed.outline.color))) {
      add('stroke.paints[0]', formatColor(color), observed.outline.color);
    }
  }
}

/**
 * 네 변이 같은 선 두께를 견준다.
 * @param stroke 피그마 선
 * @param width 브라우저 선 두께
 * @param add 다른 값을 더한다
 */
function compareUniformWeight(
  stroke: MeasuredStroke,
  width: number,
  add: (field: string, expected: string, actual: string) => void,
): void {
  for (const side of SIDES) {
    if (!isClose(stroke.weight[side], width, RECT_TOLERANCE)) {
      add(`stroke.weight.${side}`, formatPx(stroke.weight[side]), formatPx(width));
    }
  }
}

/**
 * 선 칠 하나를 견준다.
 * @param paint 피그마 칠
 * @param backgroundColor 고리의 배경색
 * @param backgroundImage 고리의 배경 그림
 * @param add 다른 값을 더한다
 */
function comparePaint(
  paint: MeasuredPaint | undefined,
  backgroundColor: string,
  backgroundImage: string,
  add: (field: string, expected: string, actual: string) => void,
): void {
  if (paint === undefined) {
    return;
  }
  if (paint.type === 'SOLID') {
    const color = paintColor(paint.color, paint.opacity);
    if (!isSameColor(color, parseColor(backgroundColor))) {
      add('stroke.paints[0]', formatColor(color), backgroundColor);
    }
  } else if (paint.type !== 'IMAGE') {
    compareStops('stroke.paints[0]', paint, backgroundImage, add);
  }
}

/**
 * 그라데이션의 색 단계를 견준다. 방향은 피그마가 최종 값을 주지 않아 견주지 않는다.
 * @param field 항목 이름
 * @param gradient 피그마 그라데이션
 * @param css 브라우저 배경 그림
 * @param add 다른 값을 더한다
 */
function compareStops(
  field: string,
  gradient: Extract<MeasuredPaint, { stops: unknown }>,
  css: string,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const stops = parseGradientStops(css);
  const expected = gradient.stops.map((stop) => ({
    position: stop.position,
    color: paintColor(stop.color, gradient.opacity),
  }));
  // tokens.css는 피그마처럼 섞으려고 두 정지점 사이에 중간 정지점을 넣는다([[디자인 시스템:토큰 생성]]).
  // 그래서 피그마의 정지점이 모두 같은 자리·색으로 있고, 남는 정지점이 처음과 끝 정지점 사이에 있으면 같다고 본다.
  const first = expected[0]?.position ?? 0;
  const last = expected.at(-1)?.position ?? 1;
  const isSame =
    expected.length > 0 &&
    expected.every(
      /**
       * 피그마 정지점이 같은 자리·색으로 브라우저에 있는지 본다.
       * @param stop 피그마 정지점
       */
      (stop) =>
        stops.some(
          (actual) =>
            isClose(stop.position, actual.position, STOP_TOLERANCE) &&
            isSameColor(stop.color, actual.color),
        ),
    ) &&
    stops.every(
      (actual) =>
        expected.some((stop) => isClose(stop.position, actual.position, STOP_TOLERANCE)) ||
        (actual.position > first && actual.position < last),
    );
  if (!isSame) {
    add(
      field,
      expected
        .map((stop) => `${formatColor(stop.color)} ${formatPercent(stop.position)}`)
        .join(', '),
      css,
    );
  }
}

/**
 * 그림자를 견준다. 피그마와 CSS는 그림자를 쌓는 순서가 반대라 순서 없이 견준다.
 * @param shadows 피그마 그림자
 * @param css 브라우저 그림자(`box-shadow` 또는 `text-shadow`)
 * @param add 다른 값을 더한다
 */
function compareShadows(
  shadows: readonly MeasuredShadow[],
  css: string,
  add: (field: string, expected: string, actual: string) => void,
): void {
  const actual = parseShadows(css).toSorted(compareShadow);
  const expected = shadows
    .map(
      /**
       * 피그마 그림자를 견줄 꼴로 옮긴다.
       * @param shadow 그림자
       */
      (shadow) => ({
        color: paintColor(shadow.color, 1),
        offsetX: shadow.offsetX,
        offsetY: shadow.offsetY,
        radius: shadow.radius,
        spread: shadow.spread,
        isInset: shadow.type === 'INNER_SHADOW',
      }),
    )
    .toSorted(compareShadow);
  const isSame =
    actual.length === expected.length &&
    expected.every(
      /**
       * 그림자 하나가 같은지 본다.
       * @param shadow 그림자
       * @param index 순서
       */
      (shadow, index) => {
        const other = actual[index];
        return (
          other !== undefined &&
          shadow.isInset === other.isInset &&
          isSameColor(shadow.color, other.color) &&
          (['offsetX', 'offsetY', 'radius', 'spread'] as const).every((key) =>
            isClose(shadow[key], other[key], RECT_TOLERANCE),
          )
        );
      },
    );
  if (!isSame) {
    add('shadows', expected.map(formatShadow).join(', ') || '없음', css);
  }
}

/** 읽은 그림자 하나 */
type ParsedShadow = {
  color: CssColor;
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
  isInset: boolean;
};

/**
 * 그림자 정렬 순서를 정한다.
 * @param a 그림자
 * @param b 그림자
 * @returns 정렬 값
 */
function compareShadow(a: ParsedShadow, b: ParsedShadow): number {
  return (
    a.offsetY - b.offsetY || a.radius - b.radius || a.offsetX - b.offsetX || a.spread - b.spread
  );
}

/**
 * 그림자를 글로 쓴다.
 * @param shadow 그림자
 * @returns 글
 */
function formatShadow(shadow: ParsedShadow): string {
  return `${formatColor(shadow.color)} ${[shadow.offsetX, shadow.offsetY, shadow.radius, shadow.spread].map(formatPx).join(' ')}${shadow.isInset ? ' inset' : ''}`;
}

/**
 * 계산된 `box-shadow`·`text-shadow` 값을 읽는다.
 * @param css 계산된 값
 * @returns 그림자
 */
export function parseShadows(css: string): ParsedShadow[] {
  if (css === 'none' || css.trim() === '') {
    return [];
  }
  return splitTopLevel(css).map(
    /**
     * 그림자 하나를 읽는다.
     * @param part 쉼표로 나눈 조각
     */
    (part) => {
      const colorText = /rgba?\([^)]*\)/u.exec(part)?.[0] ?? '';
      const numbers = part
        .replace(colorText, '')
        .replace('inset', '')
        .trim()
        .split(/\s+/u)
        .map((value) => Number.parseFloat(value));
      return {
        color: parseColor(colorText) ?? { r: 0, g: 0, b: 0, a: 0 },
        offsetX: numbers[0] ?? 0,
        offsetY: numbers[1] ?? 0,
        radius: numbers[2] ?? 0,
        spread: numbers[3] ?? 0,
        isInset: part.includes('inset'),
      };
    },
  );
}

/**
 * 계산된 그라데이션 값에서 색 단계를 읽는다. 첫 조각이 방향이면 건너뛴다.
 * @param css 계산된 `background-image`
 * @returns 색 단계(위치 0~1)
 */
export function parseGradientStops(css: string): { position: number; color: CssColor | null }[] {
  const start = css.indexOf('(');
  if (start === -1 || !css.endsWith(')')) {
    return [];
  }
  const parts = splitTopLevel(css.slice(start + 1, -1));
  const stops = parts.filter((part) => /rgba?\(/u.test(part));
  return stops.map(
    /**
     * 정지점 하나를 읽는다.
     * @param part 쉼표로 나눈 조각
     * @param index 순서
     */
    (part, index) => {
      const color = parseColor(/rgba?\([^)]*\)/u.exec(part)?.[0] ?? '');
      const percent = /(-?[0-9.]+)%/u.exec(part.replace(/rgba?\([^)]*\)/u, ''))?.[1];
      const position =
        percent === undefined
          ? stops.length === 1
            ? 0
            : index / (stops.length - 1)
          : Number(percent) / 100;
      return { position, color };
    },
  );
}

/**
 * 괄호 밖의 쉼표로 나눈다.
 * @param text 글
 * @returns 조각
 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
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
 * 계산된 CSS 색을 읽는다.
 * @param css `rgb(0, 0, 0)`, `rgba(0, 0, 0, 0.5)`, `transparent`
 * @returns 색. 읽지 못하면 null
 */
export function parseColor(css: string): CssColor | null {
  if (css === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const match = /^rgba?\(([^)]*)\)$/u.exec(css.trim());
  if (match === null) {
    return null;
  }
  const [r = 0, g = 0, b = 0, a = 1] = (match[1] ?? '')
    .split(/[,\s/]+/u)
    .filter((part) => part !== '')
    .map((part) => Number.parseFloat(part));
  return { r, g, b, a };
}

/**
 * 피그마 색과 칠 불투명도를 브라우저가 그리는 색으로 옮긴다.
 * @param color 피그마 색(0~255)
 * @param opacity 칠 불투명도
 * @returns 브라우저 색
 */
export function paintColor(color: Rgba255, opacity: number): CssColor {
  return { r: color.r, g: color.g, b: color.b, a: (color.a / 255) * opacity };
}

/**
 * 두 색이 같은지 본다. 채널과 투명도를 0~255로 견주고 반올림 차이만 받는다.
 * @param expected 피그마 색
 * @param actual 브라우저 색
 * @returns 같으면 true
 */
export function isSameColor(expected: CssColor, actual: CssColor | null): boolean {
  if (actual === null) {
    return false;
  }
  if (expected.a === 0 && actual.a === 0) {
    return true;
  }
  return (
    Math.abs(expected.r - actual.r) <= COLOR_TOLERANCE &&
    Math.abs(expected.g - actual.g) <= COLOR_TOLERANCE &&
    Math.abs(expected.b - actual.b) <= COLOR_TOLERANCE &&
    Math.abs(expected.a * 255 - actual.a * 255) <= COLOR_TOLERANCE
  );
}

/**
 * 두 수가 허용 오차 안에서 같은지 본다.
 * @param expected 기대 값
 * @param actual 실제 값
 * @param tolerance 허용 오차
 * @returns 같으면 true
 */
function isClose(expected: number, actual: number, tolerance: number): boolean {
  return Math.abs(expected - actual) <= tolerance + 1e-9;
}

/**
 * 색을 글로 쓴다.
 * @param color 색
 * @returns `rgba(0, 0, 0, 0.89)`
 */
function formatColor(color: CssColor): string {
  return `rgba(${String(color.r)}, ${String(color.g)}, ${String(color.b)}, ${String(Number(color.a.toFixed(4)))})`;
}

/**
 * px 값을 글로 쓴다.
 * @param value 값
 * @returns `12.5px`
 */
function formatPx(value: number): string {
  return `${String(Number(value.toFixed(3)))}px`;
}

/**
 * 비율을 백분율 글로 쓴다.
 * @param value 0~1
 * @returns `90.58%`
 */
function formatPercent(value: number): string {
  return `${String(Number((value * 100).toFixed(3)))}%`;
}
