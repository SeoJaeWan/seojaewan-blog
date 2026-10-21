/**
 * 피그마 레이어 정보(export.json `layers`)와 브라우저에서 잰 값을 비교한다. 브라우저·파일을 다루지 않는 순수 함수다.
 * 실패 메시지는 고칠 것을 바로 알 수 있게 `<레이어> <속성> <피그마 값> → <코드 값>`으로 쓴다.
 */

import type { CssShadow, Rgba } from './css-values.ts';
import {
  compositeOver,
  formatColor,
  parseBlur,
  parseColor,
  parseGradientStops,
  parsePx,
  parseRadius,
  parseShadows,
  sameColor,
} from './css-values.ts';
import type {
  Corners,
  FigmaEffect,
  FigmaLayer,
  FigmaPaint,
  FigmaText,
  GradientStop,
  Sides,
} from './figma-layers.ts';
import type { MeasuredElement, MeasuredStyle, VariantMeasurement } from './measured-element.ts';
import {
  GEOMETRY_TOLERANCE,
  OPACITY_TOLERANCE,
  TEXT_BASELINE_TOLERANCE,
  VALUE_TOLERANCE,
} from './parity-config.ts';

/** 실패한 검사 하나 */
export type CheckFailure = {
  /** 레이어 경로(루트는 `root`) */
  layer: string;
  /** 무엇을 고칠지 한 줄로 쓴 메시지 */
  message: string;
  /** 이미지로 보여 줄 실패(vector 모양)면 true */
  hasImage?: boolean;
};

/** vector 레이어 모양 비교 결과(실행 스크립트가 잰다) */
export type VectorResult = { ok: true } | { ok: false; message: string };

export type ValueComparison = {
  failures: CheckFailure[];
  /** 실패는 아니지만 알려 둘 것(값으로 확인할 수 없는 부분 등) */
  notes: string[];
};

/** 토큰 별칭 표: 변수 경로(`accent-fill/default`) → `#rrggbb[aa]` */
export type ColorTable = ReadonlyMap<string, string>;

const sideNames: Record<keyof Sides, string> = {
  top: '위',
  right: '오른쪽',
  bottom: '아래',
  left: '왼쪽',
};

const cornerNames: Record<keyof Corners, string> = {
  topLeft: '왼쪽 위',
  topRight: '오른쪽 위',
  bottomRight: '오른쪽 아래',
  bottomLeft: '왼쪽 아래',
};

/**
 * 변형 하나의 피그마 레이어와 브라우저 측정값을 비교한다.
 * - 루트를 뺀 모든 레이어는 같은 path의 `data-figma` 요소가 있어야 한다. 단, 칠·선·효과·불투명도가 없는 frame은
 *   구조용이라 짝이 없어도 된다(자식의 위치로 확인한다).
 * - 피그마 변형에 없는(숨긴) 레이어 이름의 요소가 화면에 보이면 실패한다.
 * @codocs [[피그마 일치 검사:값 비교]]
 * @param layers 변형의 레이어 정보(첫 항목이 루트)
 * @param measurement 브라우저 측정값
 * @param colors 토큰 색 표
 * @param vectors vector 레이어 path → 모양 비교 결과
 * @returns 실패와 알림
 */
export function compareVariantValues(
  layers: readonly FigmaLayer[],
  measurement: VariantMeasurement,
  colors: ColorTable,
  vectors: ReadonlyMap<string, VectorResult> = new Map(),
): ValueComparison {
  const result: ValueComparison = { failures: [], notes: [] };
  const byPath = new Map<string, MeasuredElement[]>();
  for (const element of measurement.elements) {
    byPath.set(element.path, [...(byPath.get(element.path) ?? []), element]);
  }

  for (const layer of layers) {
    const name = displayName(layer.path);
    const fail = failureRecorder(result, name);
    if (layer.path === '') {
      compareLayer(layer, measurement.root, colors, fail, result.notes);
      continue;
    }
    const matches = byPath.get(layer.path) ?? [];
    if (matches.length > 1) {
      fail(`data-figma 요소가 ${matches.length}개다. 하나만 둔다`);
      continue;
    }
    const [element] = matches;
    if (element === undefined) {
      if (!isStructural(layer)) {
        fail(`짝이 되는 data-figma="${layer.path}" 요소가 없다`);
      }
      continue;
    }
    if (!element.visible) {
      fail('요소가 화면에 보이지 않는다');
      continue;
    }
    compareLayer(layer, element, colors, fail, result.notes);
    if (layer.kind === 'vector') {
      const vector = vectors.get(layer.path);
      if (vector !== undefined && !vector.ok) {
        fail(vector.message, true);
      }
    }
  }

  const known = new Set(layers.map((layer) => layer.path));
  for (const [path, elements] of byPath) {
    if (!known.has(path) && elements.some((element) => element.visible)) {
      result.failures.push({
        layer: path,
        message: `${path} 피그마 변형에 없는(숨긴) 레이어가 화면에 보인다`,
      });
    }
  }
  return result;
}

/**
 * 레이어 하나의 실패를 결과에 더하는 함수를 만든다. 메시지 앞에 레이어 이름을 붙인다.
 * @param result 비교 결과
 * @param name 레이어 이름
 * @returns 실패를 기록하는 함수
 */
function failureRecorder(
  result: ValueComparison,
  name: string,
): (message: string, hasImage?: boolean) => void {
  return (message, hasImage = false) => {
    result.failures.push({ layer: name, message: `${name} ${message}`, hasImage });
  };
}

/**
 * 짝이 없어도 되는 구조용 레이어인지 확인한다. 칠·선·효과·불투명도가 없는 frame이다.
 * @codocs [[피그마 일치 검사:스토리 규칙]]
 * @param layer 레이어
 * @returns 구조용이면 true
 */
export function isStructural(layer: FigmaLayer): boolean {
  return (
    layer.kind === 'frame' &&
    (layer.fills ?? []).length === 0 &&
    (layer.strokes ?? []).length === 0 &&
    (layer.effects ?? []).length === 0 &&
    layer.opacity === undefined
  );
}

/**
 * 레이어 하나를 비교한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 */
function compareLayer(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
): void {
  const name = displayName(layer.path);
  compareBox(layer, element, fail);
  if (layer.opacity !== undefined || parsePx(element.style.opacity ?? '1') !== 1) {
    const expected = layer.opacity ?? 1;
    const actual = Number(element.style.opacity ?? '1');
    if (Math.abs(expected - actual) > OPACITY_TOLERANCE) {
      fail(`불투명도 ${format(expected)} → ${format(actual)}`);
    }
  }
  switch (layer.kind) {
    case 'text':
      compareText(layer, element, colors, fail, notes);
      compareEffects(layer.effects ?? [], element, colors, fail, notes, name, true);
      return;
    case 'vector':
      compareVectorColor(layer, element, colors, fail);
      return;
    case 'image':
    case 'frame':
      compareFrame(layer, element, colors, fail, notes);
      return;
  }
}

/**
 * 위치와 크기를 비교한다. 자동 너비 글자는 피그마가 너비를 올림하므로 x·폭 대신 잉크 영역으로 비교한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param fail 실패를 기록하는 함수
 */
function compareBox(
  layer: FigmaLayer,
  element: MeasuredElement,
  fail: (message: string) => void,
): void {
  const isAutoWidthText = layer.text?.autoResize === 'WIDTH_AND_HEIGHT';
  const fields: [keyof typeof element.box, string][] = [
    ['x', 'x'],
    ['y', 'y'],
    ['width', '폭'],
    ['height', '높이'],
  ];
  for (const [field, label] of fields) {
    if (isAutoWidthText && (field === 'x' || field === 'width')) {
      continue;
    }
    const expected = layer[field];
    const actual = element.box[field];
    if (Math.abs(expected - actual) > GEOMETRY_TOLERANCE) {
      fail(`${label} ${format(expected)} → ${format(actual)} (±${GEOMETRY_TOLERANCE})`);
    }
  }
}

/**
 * frame·image 레이어의 자동 배치, 반경, 칠, 선, 효과를 비교한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 */
function compareFrame(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
): void {
  const name = displayName(layer.path);
  const { style } = element;
  if (layer.layoutMode !== undefined && layer.padding !== undefined) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const actual = parsePx(style[`padding-${side}`] ?? '');
      if (Math.abs(layer.padding[side] - actual) > VALUE_TOLERANCE) {
        fail(`안쪽 여백 ${sideNames[side]} ${format(layer.padding[side])} → ${format(actual)}`);
      }
    }
  }
  if (
    layer.layoutMode !== undefined &&
    layer.itemSpacing !== undefined &&
    layer.primaryAxisAlignItems !== 'SPACE_BETWEEN'
  ) {
    const actual = parsePx(
      (layer.layoutMode === 'VERTICAL' ? style['row-gap'] : style['column-gap']) ?? '',
    );
    if (Math.abs(layer.itemSpacing - actual) > VALUE_TOLERANCE) {
      fail(`간격 ${format(layer.itemSpacing)} → ${format(actual)}`);
    }
  }
  compareRadius(layer, element, fail);
  compareFills(layer, element, colors, fail, notes);
  compareStrokes(layer, element, colors, fail, notes);
  compareEffects(layer.effects ?? [], element, colors, fail, notes, name, false);
}

/**
 * 모서리 반경을 비교한다. 반경은 상자 짧은 변의 절반을 넘을 수 없으므로 양쪽 모두 그 값으로 줄여 비교한다.
 * 타원은 짧은 변의 절반인 원형 반경이어야 한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param fail 실패를 기록하는 함수
 */
function compareRadius(
  layer: FigmaLayer,
  element: MeasuredElement,
  fail: (message: string) => void,
): void {
  const limit = Math.min(layer.width, layer.height) / 2;
  let expected: Corners | undefined;
  if (layer.type === 'ELLIPSE') {
    expected = { topLeft: limit, topRight: limit, bottomRight: limit, bottomLeft: limit };
  } else if (typeof layer.cornerRadius === 'number') {
    const value = layer.cornerRadius;
    expected = { topLeft: value, topRight: value, bottomRight: value, bottomLeft: value };
  } else {
    expected = layer.cornerRadius;
  }
  if (expected === undefined) {
    return;
  }
  const { style } = element;
  const actual: Corners = {
    topLeft: parseRadius(style['border-top-left-radius'] ?? ''),
    topRight: parseRadius(style['border-top-right-radius'] ?? ''),
    bottomRight: parseRadius(style['border-bottom-right-radius'] ?? ''),
    bottomLeft: parseRadius(style['border-bottom-left-radius'] ?? ''),
  };
  const corners: (keyof Corners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  /**
   * 반경을 짧은 변의 절반 이하로 줄인다.
   * @param value 반경
   * @returns 줄인 반경
   */
  function clamp(value: number): number {
    return Math.min(value, limit);
  }
  const wrong = corners.filter(
    (corner) => Math.abs(clamp(expected[corner]) - clamp(actual[corner])) > VALUE_TOLERANCE,
  );
  if (wrong.length === 0) {
    return;
  }
  const isUniform = corners.every((corner) => expected[corner] === expected.topLeft);
  if (
    isUniform &&
    wrong.length === 4 &&
    corners.every((corner) => actual[corner] === actual.topLeft)
  ) {
    fail(`반경 ${format(clamp(expected.topLeft))} → ${format(clamp(actual.topLeft))}`);
    return;
  }
  for (const corner of wrong) {
    fail(
      `반경 ${cornerNames[corner]} ${format(clamp(expected[corner]))} → ${format(clamp(actual[corner]))}`,
    );
  }
}

/**
 * 칠을 비교한다. 보이는 단색 칠을 일반 합성한 색이 배경색과 같아야 하고, 이미지 칠은 같은 이미지여야 한다.
 * 칠이 없으면 배경도 없어야 한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 */
function compareFills(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
): void {
  const name = displayName(layer.path);
  const fills = layer.fills ?? [];
  const solids = fills.filter((paint) => paint.type === 'SOLID');
  const visibleSolids: { paint: Extract<FigmaPaint, { type: 'SOLID' }>; rgba: Rgba }[] = [];
  for (const paint of solids) {
    const rgba = expectedColor(paint, colors, (message) => {
      fail(`채우기 ${message}`);
    });
    if (rgba === undefined) {
      return;
    }
    if (rgba[3] === 0 && paint.blendMode !== undefined) {
      notes.push(`${name}: 불투명도 0인 ${paint.blendMode} 칠은 보이지 않아 비교하지 않는다`);
      continue;
    }
    if (paint.blendMode !== undefined) {
      notes.push(
        `${name}: ${paint.blendMode} 블렌드 칠은 CSS 배경색으로 재현하지 않아 색 값만 비교한다`,
      );
    }
    visibleSolids.push({ paint, rgba });
  }
  const actual = borderOnlyColor(element) ??
    parseColor(element.style['background-color'] ?? '') ?? [0, 0, 0, 0];
  const expected = visibleSolids.reduceRight<Rgba>(
    (bottom, { rgba }) => compositeOver(rgba, bottom),
    [0, 0, 0, 0],
  );
  if (!sameColor(expected, actual)) {
    const label =
      visibleSolids.length === 1 && visibleSolids[0]?.paint.token !== undefined
        ? `${tokenName(visibleSolids[0].paint.token)} `
        : '';
    fail(`채우기 ${label}${colorText(expected)} → ${colorText(actual)}`);
  }

  const gradient = fills.find((paint) => paint.type === 'GRADIENT_LINEAR');
  const backgroundStops = parseGradientStops(element.style['background-image'] ?? '');
  if (gradient !== undefined) {
    compareGradient(gradient.stops, backgroundStops, colors, (message) => {
      fail(`채우기 ${message}`);
    });
  }
  for (const paint of fills) {
    if (paint.type === 'IMAGE') {
      compareImagePaint(paint, element, fail);
    } else if (paint.type === 'OTHER') {
      fail(`채우기 ${paint.paintType}는 비교할 수 없다. 단색·선형 그라데이션·이미지만 쓴다`);
    }
  }
}

/**
 * 이미지 칠을 비교한다. 같은 바이트(SHA-1이 피그마 imageHash와 같음)의 이미지를 같은 불투명도와 배치로 그려야 한다.
 * @param paint 피그마 이미지 칠
 * @param element 측정값
 * @param fail 실패를 기록하는 함수
 */
function compareImagePaint(
  paint: Extract<FigmaPaint, { type: 'IMAGE' }>,
  element: MeasuredElement,
  fail: (message: string) => void,
): void {
  const image = element.images.find((candidate) => candidate.sha1 === paint.imageHash);
  if (image === undefined) {
    const seen = element.images.map((candidate) => candidate.sha1 ?? `${candidate.url}(못 받음)`);
    fail(
      `이미지 다른 이미지 ${paint.imageHash ?? '(없음)'} → ${seen.length === 0 ? '없음' : seen.join(', ')}`,
    );
    return;
  }
  if (Math.abs(image.opacity - paint.opacity) > OPACITY_TOLERANCE) {
    fail(`이미지 불투명도 ${format(paint.opacity)} → ${format(image.opacity)}`);
  }
  const isRepeated = image.source !== 'img' && !image.repeat.startsWith('no-repeat');
  if (paint.scaleMode === 'TILE' && !isRepeated) {
    fail(`이미지 바둑판 반복(TILE) → ${image.repeat}`);
  }
  if (paint.scaleMode === 'FILL' && image.source !== 'img' && image.size !== 'cover') {
    fail(`이미지 채우기(FILL, cover) → ${image.size}`);
  }
  if (paint.scaleMode === 'FIT' && image.source !== 'img' && image.size !== 'contain') {
    fail(`이미지 맞추기(FIT, contain) → ${image.size}`);
  }
}

/**
 * 선을 비교한다. 선은 ::before 고리(border-gradient-*, inner-border-*), CSS border,
 * 또는 data-figma-stroke SVG로 그린다. 피그마에 선이 없으면 셋 다 없어야 한다.
 * @param layer 피그마 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 */
function compareStrokes(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
): void {
  const measured = borderOnlyColor(element) === null ? measuredStroke(element) : null;
  const strokes = layer.strokes ?? [];
  if (strokes.length === 0) {
    if (measured !== null && measured.width > 0 && !measured.isTransparent) {
      fail(`선 없음 → ${format(measured.width)}px ${measured.description}`);
    }
    return;
  }
  if (strokes.length > 1) {
    fail('선이 여러 겹이다. 비교할 수 있게 선을 하나로 둔다');
    return;
  }
  const [stroke] = strokes;
  const weight = layer.strokeWeight;
  if (measured === null) {
    fail(`선 ${typeof weight === 'number' ? `${format(weight)}px` : ''} → 없음`);
    return;
  }
  if (typeof weight === 'number') {
    if (Math.abs(weight - measured.width) > VALUE_TOLERANCE) {
      fail(`선 두께 ${format(weight)} → ${format(measured.width)}`);
    }
  } else if (weight !== undefined) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const actual = measured.sides?.[side] ?? measured.width;
      if (Math.abs(weight[side] - actual) > VALUE_TOLERANCE) {
        fail(`선 두께 ${sideNames[side]} ${format(weight[side])} → ${format(actual)}`);
      }
    }
  }
  if (layer.strokeAlign !== undefined && layer.strokeAlign !== 'INSIDE') {
    notes.push(`${displayName(layer.path)}: ${layer.strokeAlign} 선은 두께와 색만 비교한다`);
  }
  if (stroke?.type === 'SOLID') {
    const expected = expectedColor(stroke, colors, (message) => {
      fail(`선 ${message}`);
    });
    if (expected === undefined) {
      return;
    }
    if (measured.color === null) {
      fail(`선 ${tokenLabel(stroke.token)}${colorText(expected)} → 그라데이션`);
    } else if (!sameColor(expected, measured.color)) {
      fail(`선 ${tokenLabel(stroke.token)}${colorText(expected)} → ${colorText(measured.color)}`);
    }
  } else if (stroke?.type === 'GRADIENT_LINEAR') {
    compareGradient(stroke.stops, measured.gradient, colors, (message) => {
      fail(`선 ${message}`);
    });
  } else if (stroke !== undefined) {
    fail('선은 단색이나 선형 그라데이션만 비교할 수 있다');
  }
}

type MeasuredStroke = {
  width: number;
  sides?: Sides;
  color: Rgba | null;
  gradient: ReturnType<typeof parseGradientStops>;
  isTransparent: boolean;
  description: string;
};

/**
 * 안쪽(내용과 여백) 크기가 0이라 테두리만으로 그려지는 요소(예: 높이가 테두리 두께인 선)의 색을 구한다.
 * 이런 요소는 테두리 색으로 칠한 사각형과 같으므로 피그마 사각형의 칠과 비교한다.
 * @param element 측정값
 * @returns 테두리 색, 테두리만으로 그려지는 요소가 아니면 null
 */
function borderOnlyColor(element: MeasuredElement): Rgba | null {
  const { style } = element;
  const top = parsePx(style['border-top-width'] ?? '');
  const right = parsePx(style['border-right-width'] ?? '');
  const bottom = parsePx(style['border-bottom-width'] ?? '');
  const left = parsePx(style['border-left-width'] ?? '');
  const innerWidth = element.box.width - left - right;
  const innerHeight = element.box.height - top - bottom;
  const background = parseColor(style['background-color'] ?? '') ?? [0, 0, 0, 0];
  if (
    top + right + bottom + left === 0 ||
    background[3] !== 0 ||
    (innerWidth > 0.01 && innerHeight > 0.01)
  ) {
    return null;
  }
  const side = top > 0 ? 'top' : bottom > 0 ? 'bottom' : left > 0 ? 'left' : 'right';
  return parseColor(style[`border-${side}-color`] ?? '') ?? null;
}

/**
 * 요소가 그리는 선을 찾는다.
 * @param element 측정값
 * @returns 선, 없으면 null
 */
function measuredStroke(element: MeasuredElement): MeasuredStroke | null {
  if (element.strokeSvg !== null) {
    const color = parseColor(element.strokeSvg.stroke ?? '') ?? null;
    return {
      width: parsePx(element.strokeSvg['stroke-width'] ?? ''),
      color,
      gradient: null,
      isTransparent: color === null || color[3] === 0,
      description: 'SVG stroke',
    };
  }
  const ring = element.before;
  if (
    ring !== null &&
    (ring.content ?? 'none') !== 'none' &&
    ring.position === 'absolute' &&
    (ring['mask-image'] ?? 'none') !== 'none'
  ) {
    const gradient = parseGradientStops(ring['background-image'] ?? '');
    const color = parseColor(ring['background-color'] ?? '') ?? null;
    const isGradient = gradient !== null && gradient.length > 0;
    return {
      width: parsePx(ring['padding-top'] ?? ''),
      color: isGradient ? null : color,
      gradient: isGradient ? gradient : null,
      isTransparent: !isGradient && (color === null || color[3] === 0),
      description: '::before 고리',
    };
  }
  const { style } = element;
  const sides: Sides = {
    top: parsePx(style['border-top-width'] ?? ''),
    right: parsePx(style['border-right-width'] ?? ''),
    bottom: parsePx(style['border-bottom-width'] ?? ''),
    left: parsePx(style['border-left-width'] ?? ''),
  };
  const widths = Object.values(sides);
  if (widths.every((width) => width === 0)) {
    return null;
  }
  const colorSide = (['top', 'right', 'bottom', 'left'] as const).find((side) => sides[side] > 0);
  const color = parseColor(style[`border-${colorSide ?? 'top'}-color`] ?? '') ?? null;
  return {
    width: Math.max(...widths),
    sides,
    color,
    gradient: null,
    isTransparent: color === null || color[3] === 0,
    description: 'CSS border',
  };
}

/**
 * 선형 그라데이션의 양 끝 색 지점(색과 위치)을 비교한다. CSS에는 피그마 방식으로 계산한 중간 지점이 더 있다.
 * @param stops 피그마 색 지점
 * @param actual 브라우저 색 지점
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수(앞에 칠·선을 붙인다)
 */
function compareGradient(
  stops: readonly GradientStop[],
  actual: ReturnType<typeof parseGradientStops>,
  colors: ColorTable,
  fail: (message: string) => void,
): void {
  if (actual === null || actual.length === 0) {
    fail('그라데이션 → 없음');
    return;
  }
  const ends: [GradientStop | undefined, (typeof actual)[number] | undefined, string][] = [
    [stops[0], actual[0], '시작'],
    [stops.at(-1), actual.at(-1), '끝'],
  ];
  for (const [stop, measured, label] of ends) {
    if (stop === undefined || measured === undefined) {
      continue;
    }
    const expected = expectedColor(stop, colors, fail);
    if (expected === undefined) {
      return;
    }
    if (!sameColor(expected, measured.color)) {
      fail(
        `그라데이션 ${label} ${tokenLabel(stop.token)}${colorText(expected)} → ${colorText(measured.color)}`,
      );
    }
    const position = measured.position ?? (label === '시작' ? 0 : 100);
    if (Math.abs(stop.position * 100 - position) > 0.1) {
      fail(`그라데이션 ${label} 위치 ${format(stop.position * 100)}% → ${format(position)}%`);
    }
  }
}

/**
 * 효과(그림자, 배경 블러, 레이어 블러)를 비교한다. 그림자는 순서와 상관없이 같은 그림자가 모두 있어야 한다.
 * @param effects 피그마 효과
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 * @param name 레이어 이름
 * @param isText 글자 레이어면 text-shadow와 비교한다
 */
function compareEffects(
  effects: readonly FigmaEffect[],
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
  name: string,
  isText: boolean,
): void {
  const shadows = parseShadows(
    (isText ? element.style['text-shadow'] : element.style['box-shadow']) ?? '',
  );
  const expectedShadows: CssShadow[] = [];
  for (const effect of effects) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const color = expectedColor(effect, colors, (message) => {
        fail(`그림자 ${message}`);
      });
      if (color === undefined) {
        return;
      }
      expectedShadows.push({
        color,
        offsetX: effect.offsetX,
        offsetY: effect.offsetY,
        blur: effect.radius,
        spread: isText ? 0 : effect.spread,
        inset: effect.type === 'INNER_SHADOW',
      });
    } else if (effect.type === 'BACKGROUND_BLUR' || effect.type === 'LAYER_BLUR') {
      const property = effect.type === 'BACKGROUND_BLUR' ? 'backdrop-filter' : 'filter';
      const actual = parseBlur(element.style[property] ?? '');
      const label = effect.type === 'BACKGROUND_BLUR' ? '배경 블러' : '레이어 블러';
      if (actual === null || Math.abs(actual - effect.radius) > VALUE_TOLERANCE) {
        fail(`${label} ${format(effect.radius)} → ${actual === null ? '없음' : format(actual)}`);
      }
    } else if ('effectType' in effect) {
      notes.push(`${name}: ${effect.effectType} 효과는 값으로 비교할 수 없다`);
    }
  }
  const remaining = [...shadows];
  for (const expected of expectedShadows) {
    const index = remaining.findIndex((actual) => sameShadow(expected, actual));
    if (index >= 0) {
      remaining.splice(index, 1);
    } else {
      fail(
        `그림자 ${shadowText(expected)} → ${shadows.length === 0 ? '없음' : shadows.map(shadowText).join(', ')}`,
      );
    }
  }
  for (const extra of remaining) {
    if (
      extra.color[3] > 0 &&
      !(extra.blur === 0 && extra.offsetX === 0 && extra.offsetY === 0 && extra.spread === 0)
    ) {
      fail(`그림자 없음 → ${shadowText(extra)}`);
    }
  }
}

/**
 * 글자를 비교한다: 글자 내용(줄바꿈 표기만 맞춤), 실제로 그린 서체, 크기, 굵기, 줄 높이, 자간, 색, 잉크 영역.
 * @param layer 피그마 글자 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 */
function compareText(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
  notes: string[],
): void {
  const text = layer.text;
  const measured = element.text;
  if (text === undefined) {
    return;
  }
  if (measured === null) {
    fail('글자 요소를 잴 수 없다');
    return;
  }
  const expectedContent = normalizeLineBreaks(text.characters);
  const actualContent = normalizeLineBreaks(measured.content);
  if (expectedContent !== actualContent) {
    fail(`글자 '${expectedContent}' → '${actualContent}'`);
  }
  compareFonts(text, measured.platformFonts, element.style, fail, notes, displayName(layer.path));
  compareNumber(
    text.fontSize,
    parsePx(element.style['font-size'] ?? ''),
    '글자 크기',
    fail,
    notes,
    layer,
  );
  compareNumber(
    text.fontWeight,
    Number(element.style['font-weight'] ?? '0'),
    '굵기',
    fail,
    notes,
    layer,
  );
  const lineHeight = element.style['line-height'] ?? 'normal';
  if (text.lineHeight === 'AUTO') {
    if (lineHeight !== 'normal') {
      fail(`줄 높이 자동 → ${lineHeight}`);
    }
  } else if (typeof text.lineHeight === 'number') {
    compareNumber(text.lineHeight, parsePx(lineHeight), '줄 높이', fail, notes, layer);
  } else {
    notes.push(`${displayName(layer.path)}: 구간마다 줄 높이가 달라 비교하지 않는다`);
  }
  compareNumber(
    text.letterSpacing,
    parsePx(element.style['letter-spacing'] ?? ''),
    '자간',
    fail,
    notes,
    layer,
  );

  const fill = (layer.fills ?? []).find((paint) => paint.type === 'SOLID');
  if (fill !== undefined) {
    const expected = expectedColor(fill, colors, (message) => {
      fail(`글자 색 ${message}`);
    });
    const actual = parseColor(measured.color);
    if (expected !== undefined && (actual === undefined || !sameColor(expected, actual))) {
      fail(
        `글자 색 ${tokenLabel(fill.token)}${colorText(expected)} → ${actual === undefined ? measured.color : colorText(actual)}`,
      );
    }
  }
  if (text.ink !== undefined) {
    if (measured.ink === null) {
      fail('잉크 영역을 잴 수 없다');
    } else {
      const fields: [keyof NonNullable<FigmaText['ink']>, string, number][] = [
        ['x', '잉크 x', GEOMETRY_TOLERANCE],
        ['y', '잉크 y', TEXT_BASELINE_TOLERANCE],
        ['width', '잉크 폭', GEOMETRY_TOLERANCE],
        ['height', '잉크 높이', GEOMETRY_TOLERANCE],
      ];
      for (const [field, label, tolerance] of fields) {
        const expected = text.ink[field];
        const actual = measured.ink[field];
        if (Math.abs(expected - actual) > tolerance) {
          fail(`${label} ${format(expected)} → ${format(actual)} (±${tolerance})`);
        }
      }
    }
  } else if ((layer.effects ?? []).length > 0) {
    notes.push(
      `${displayName(layer.path)}: 효과가 있는 글자는 잉크 영역 대신 상자로만 위치를 비교한다`,
    );
  }
}

/**
 * 실제로 글자를 그린 서체가 피그마 서체와 같은지 비교한다.
 * Chromium이 그린 서체를 알려 주지 않으면 계산된 font-family 목록에 피그마 서체가 모두 있는지로 대신한다.
 * @param text 피그마 글자 정보
 * @param platformFonts 실제로 그린 서체
 * @param style 계산된 스타일
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 * @param name 레이어 이름
 */
function compareFonts(
  text: FigmaText,
  platformFonts: string[] | null,
  style: MeasuredStyle,
  fail: (message: string) => void,
  notes: string[],
  name: string,
): void {
  const expected = [...new Set(text.fontFamily)].sort();
  if (platformFonts !== null && platformFonts.length > 0) {
    const actual = [...new Set(platformFonts)].sort();
    if (expected.join(',') !== actual.join(',')) {
      fail(`서체 ${expected.join(', ')} → ${actual.join(', ')}`);
    }
    return;
  }
  const stack = (style['font-family'] ?? '')
    .split(',')
    .map((family) => family.trim().replace(/^['"]|['"]$/gu, ''));
  const missing = expected.filter((family) => !stack.includes(family));
  if (missing.length > 0) {
    fail(`서체 ${expected.join(', ')} → ${stack.join(', ')}`);
  } else {
    notes.push(`${name}: 그린 서체를 알 수 없어 font-family 목록으로만 확인했다`);
  }
}

/**
 * 숫자 하나를 비교한다. 피그마 구간마다 값이 다르면 비교하지 않고 알린다.
 * @param expected 피그마 값(구간마다 다르면 목록)
 * @param actual 브라우저 값
 * @param label 속성 이름
 * @param fail 실패를 기록하는 함수
 * @param notes 알림 목록
 * @param layer 레이어
 */
function compareNumber(
  expected: number | number[],
  actual: number,
  label: string,
  fail: (message: string) => void,
  notes: string[],
  layer: FigmaLayer,
): void {
  if (Array.isArray(expected)) {
    notes.push(`${displayName(layer.path)}: 구간마다 ${label}가 달라 비교하지 않는다`);
    return;
  }
  if (Math.abs(expected - actual) > VALUE_TOLERANCE) {
    fail(`${label} ${format(expected)} → ${format(actual)}`);
  }
}

/**
 * vector 레이어의 색을 비교한다. 피그마 도형이 한 가지 칠을 쓰고 코드 SVG 도형도 한 가지 칠을 쓸 때만 값으로 비교한다.
 * 모양과 색은 SVG 렌더링 비교가 함께 확인한다.
 * @param layer 피그마 vector 레이어
 * @param element 측정값
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 */
function compareVectorColor(
  layer: FigmaLayer,
  element: MeasuredElement,
  colors: ColorTable,
  fail: (message: string) => void,
): void {
  const fills = (layer.fills ?? []).filter((paint) => paint.type === 'SOLID');
  const [fill] = fills;
  const actualFills = [...new Set(element.shapeFills)];
  if (fills.length !== 1 || fill === undefined || actualFills.length !== 1) {
    return;
  }
  const expected = expectedColor(fill, colors, (message) => {
    fail(`색 ${message}`);
  });
  const actual = parseColor(actualFills[0] ?? '');
  if (expected !== undefined && (actual === undefined || !sameColor(expected, actual))) {
    fail(`색 ${tokenLabel(fill.token)}${colorText(expected)} → ${actualFills[0] ?? ''}`);
  }
}

/**
 * 칠·효과·색 지점의 기대 색을 구한다. 토큰 별칭이 있으면 tokens.json에서 푼 값, 없으면 피그마 색이다.
 * @param paint 색과 토큰 별칭
 * @param paint.color 피그마 색
 * @param paint.token 토큰 별칭
 * @param colors 토큰 색 표
 * @param fail 실패를 기록하는 함수
 * @returns RGBA, 토큰을 풀 수 없으면 undefined
 */
function expectedColor(
  paint: { color: string; token?: string },
  colors: ColorTable,
  fail: (message: string) => void,
): Rgba | undefined {
  if (paint.token !== undefined) {
    const hex = colors.get(tokenName(paint.token).split('.').join('/'));
    if (hex === undefined) {
      fail(`토큰 ${tokenName(paint.token)}을 tokens.json에서 찾을 수 없다`);
      return undefined;
    }
    return parseColor(hex);
  }
  const rgba = parseColor(paint.color);
  if (rgba === undefined) {
    fail(`피그마 색 ${paint.color}을 읽을 수 없다`);
  }
  return rgba;
}

/**
 * 두 그림자가 같은지 확인한다.
 * @param expected 피그마 그림자
 * @param actual 브라우저 그림자
 * @returns 같으면 true
 */
function sameShadow(expected: CssShadow, actual: CssShadow): boolean {
  return (
    expected.inset === actual.inset &&
    sameColor(expected.color, actual.color) &&
    Math.abs(expected.offsetX - actual.offsetX) <= VALUE_TOLERANCE &&
    Math.abs(expected.offsetY - actual.offsetY) <= VALUE_TOLERANCE &&
    Math.abs(expected.blur - actual.blur) <= VALUE_TOLERANCE &&
    Math.abs(expected.spread - actual.spread) <= VALUE_TOLERANCE
  );
}

/**
 * 그림자를 메시지용으로 쓴다.
 * @param shadow 그림자
 * @returns `0 8 16 0 #00000024`
 */
function shadowText(shadow: CssShadow): string {
  const values = [shadow.offsetX, shadow.offsetY, shadow.blur, shadow.spread].map(format).join(' ');
  return `${shadow.inset ? 'inset ' : ''}${values} ${formatColor(shadow.color)}`;
}

/**
 * 토큰 별칭(`{accent-fill.default}`)에서 이름(`accent-fill.default`)만 꺼낸다.
 * @param alias 토큰 별칭
 * @returns 토큰 이름
 */
function tokenName(alias: string): string {
  return alias.replace(/^\{|\}$/gu, '');
}

/**
 * 메시지 앞에 붙일 토큰 이름이다.
 * @param alias 토큰 별칭
 * @returns `accent-fill.default ` 또는 빈 문자열
 */
function tokenLabel(alias: string | undefined): string {
  return alias === undefined ? '' : `${tokenName(alias)} `;
}

/**
 * 색을 메시지용으로 쓴다. 완전히 투명하면 `투명`이다.
 * @param rgba 색
 * @returns 16진수 색
 */
function colorText(rgba: Rgba): string {
  return rgba[3] === 0 ? '투명' : formatColor(rgba);
}

/**
 * 줄바꿈 표기를 `\n`으로 맞춘다(피그마의 줄 구분 문자 U+2028 포함).
 * @param value 글자
 * @returns 줄바꿈을 맞춘 글자
 */
function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?|\u2028/gu, '\n');
}

/**
 * 레이어 경로를 메시지용 이름으로 바꾼다. 루트는 `root`다.
 * @param path 레이어 경로
 * @returns 이름
 */
function displayName(path: string): string {
  return path === '' ? 'root' : path;
}

/**
 * 숫자를 소수 둘째 자리까지 쓴다.
 * @param value 숫자
 * @returns 문자열
 */
function format(value: number): string {
  return String(Math.round(value * 100) / 100);
}
