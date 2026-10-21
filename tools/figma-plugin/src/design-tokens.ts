import { colorToHex, type FigmaColor } from './color';
import type { JsonObject, JsonValue } from './stable-json';

// 피그마 API 값을 옮겨 담은 순수 데이터 모양. figma-reader.ts가 피그마 객체를 이 모양으로 바꾼다.

/** 다른 변수를 가리키는 값 */
export type VariableAlias = { type: 'VARIABLE_ALIAS'; id: string };

/** 계약에 없는 피그마 값. 변환하면 중단 사유로 보고한다. */
export type UnsupportedValue = { type: 'UNSUPPORTED'; description: string };

export type VariableValueInput =
  boolean | number | string | FigmaColor | VariableAlias | UnsupportedValue;

export type VariableInput = {
  id: string;
  name: string;
  collection: string;
  /** 피그마 변수 타입. COLOR·FLOAT·STRING 밖의 타입(BOOLEAN 등)은 계약에 없다. */
  resolvedType: string;
  scopes: readonly string[];
  /** 컬렉션 기본 모드의 값 */
  value: VariableValueInput;
};

export type TextStyleField =
  'fontFamily' | 'fontStyle' | 'fontWeight' | 'fontSize' | 'lineHeight' | 'letterSpacing';

export type TextStyleInput = {
  name: string;
  fontFamily: string;
  /** 피그마 글꼴 스타일 이름(예: `Regular`, `SemiBold`) */
  fontStyle: string;
  fontSize: number;
  lineHeight: { unit: 'PIXELS' | 'PERCENT'; value: number } | { unit: 'AUTO' };
  letterSpacing: { unit: 'PIXELS' | 'PERCENT'; value: number };
  boundVariables: Partial<Record<TextStyleField, VariableAlias>>;
};

export type ShadowEffectInput = {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  visible: boolean;
  color: FigmaColor;
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
  boundVariables: Partial<
    Record<'color' | 'radius' | 'spread' | 'offsetX' | 'offsetY', VariableAlias>
  >;
};

export type BlurEffectInput = {
  type: 'BACKGROUND_BLUR' | 'LAYER_BLUR';
  visible: boolean;
  radius: number;
  boundVariables: Partial<Record<'radius', VariableAlias>>;
};

export type EffectInput =
  ShadowEffectInput | BlurEffectInput | (UnsupportedValue & { visible: boolean });

export type EffectStyleInput = { name: string; effects: readonly EffectInput[] };

export type SolidPaintInput = {
  type: 'SOLID';
  visible: boolean;
  opacity: number;
  blendMode: string;
  color: FigmaColor;
  boundVariables: Partial<Record<'color', VariableAlias>>;
};

export type ImagePaintInput = {
  type: 'IMAGE';
  visible: boolean;
  opacity: number;
  blendMode: string;
  imageHash: string | null;
  scaleMode: string;
  scalingFactor?: number;
};

export type GradientStopInput = {
  color: FigmaColor;
  position: number;
  boundVariables: Partial<Record<'color', VariableAlias>>;
};

export type GradientPaintInput = {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  visible: boolean;
  opacity: number;
  blendMode: string;
  gradientStops: readonly GradientStopInput[];
  /** 2×3 아핀 변환 행렬 `[[a, b, c], [d, e, f]]` */
  gradientTransform: readonly (readonly number[])[];
};

export type PaintInput =
  | SolidPaintInput
  | ImagePaintInput
  | GradientPaintInput
  | (UnsupportedValue & { visible: boolean });

export type PaintStyleInput = { name: string; paints: readonly PaintInput[] };

/** 변환 결과. 토큰이 아니라서 넣지 않은 스타일(이미지만 있는 칠 스타일)을 함께 돌려준다. */
export type DesignTokensResult = {
  tokens: JsonObject;
  skippedStyles: string[];
};

export type DesignTokensInput = {
  variables: readonly VariableInput[];
  /** 별칭이 가리키는 변수 ID → 변수 이름. 다른 파일(라이브러리) 변수도 담는다. */
  aliasNames: Readonly<Record<string, string>>;
  textStyles: readonly TextStyleInput[];
  effectStyles: readonly EffectStyleInput[];
  paintStyles: readonly PaintStyleInput[];
  /** 이미지 해시 → 이미지 자산 파일(`images/noise-acrylic.png`). Foundations / Assets / Images의 이름 있는 자산이다(G4) */
  imageAssets: Readonly<Record<string, string>>;
};

const FIGMA_EXTENSION = 'com.figma';
const PROJECT_EXTENSION = 'com.seojaewan';
const NUMBER_PRECISION = 10_000;

const fontWeights: Readonly<Record<string, number>> = { Regular: 400, SemiBold: 600, Bold: 700 };

/**
 * Variables와 글자·효과·칠 스타일을 W3C 디자인 토큰(DTCG) 형식의 토큰 트리로 바꾼다.
 * 별칭은 풀지 않고 `{경로}`로 남긴다. 계약에 없는 값이 하나라도 있으면 모두 모아 중단한다.
 * 단색도 그라디언트도 보이지 않는 칠 스타일(이미지만 있는 배경 등)은 토큰이 아니므로 넣지 않고 따로 알린다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param input 피그마에서 읽은 변수와 스타일
 * @returns tokens.json에 쓸 토큰 트리와 넣지 않은 스타일
 */
export function buildDesignTokens(input: DesignTokensInput): DesignTokensResult {
  const root: JsonObject = {};
  const skippedStyles: string[] = [];
  const problems: string[] = [];
  const context: ConversionContext = {
    aliasNames: input.aliasNames,
    imageAssets: input.imageAssets,
    problems,
  };

  for (const variable of input.variables) {
    const token = variableToken(variable, context);
    if (token !== null) {
      insertToken(root, variable.name.split('/'), token, `변수 ${variable.name}`, problems);
    }
  }
  for (const style of input.textStyles) {
    insertStyle(root, 'text', style.name, textStyleToken(style, context), problems);
  }
  for (const style of input.effectStyles) {
    insertStyle(root, 'effect', style.name, effectStyleToken(style, context), problems);
  }
  for (const style of input.paintStyles) {
    const token = paintStyleToken(style, context);
    if (token === null) {
      skippedStyles.push(style.name);
    } else {
      insertStyle(root, 'paint', style.name, token, problems);
    }
  }

  if (problems.length > 0) {
    throw new Error(`토큰을 내보낼 수 없다.\n- ${problems.join('\n- ')}`);
  }
  return { tokens: root, skippedStyles };
}

/**
 * 변수 이름을 DTCG 별칭 참조로 바꾼다. 예: `color/gray/f9f9f9` → `{color.gray.f9f9f9}`
 * @param name 가리키는 변수 이름
 * @returns 별칭 참조 문자열
 */
export function aliasReference(name: string): string {
  return `{${name.split('/').join('.')}}`;
}

/**
 * `cubic-bezier(x1, y1, x2, y2)` 또는 `linear` 문자열을 네 숫자로 바꾼다.
 * @param easing 이징 문자열
 * @returns `[x1, y1, x2, y2]`, 해석할 수 없으면 null
 */
export function parseCubicBezier(easing: string): number[] | null {
  const trimmed = easing.trim();
  if (trimmed === 'linear') {
    return [0, 0, 1, 1];
  }
  const match = /^cubic-bezier\(([^)]*)\)$/u.exec(trimmed);
  if (match === null) {
    return null;
  }
  const values = (match[1] ?? '').split(',').map((part) => Number(part.trim()));
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return values;
}

type ConversionContext = {
  aliasNames: Readonly<Record<string, string>>;
  imageAssets: Readonly<Record<string, string>>;
  problems: string[];
};

/**
 * 변수 하나를 토큰으로 바꾼다. 타입은 변수 이름과 값 종류로 정한다.
 * @param variable 바꿀 변수
 * @param context 별칭 이름표와 문제 목록
 * @returns 토큰, 바꿀 수 없으면 null
 */
function variableToken(variable: VariableInput, context: ConversionContext): JsonObject | null {
  const label = `변수 ${variable.name}`;
  const typed = variableTypeAndValue(variable, label, context);
  if (typed === null) {
    return null;
  }
  return {
    $type: typed.type,
    $value: typed.value,
    $extensions: {
      [FIGMA_EXTENSION]: { collection: variable.collection, scopes: [...variable.scopes] },
    },
  };
}

/**
 * 변수의 `$type`과 `$value`를 정한다.
 * @param variable 바꿀 변수
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 타입과 값, 바꿀 수 없으면 null
 */
function variableTypeAndValue(
  variable: VariableInput,
  label: string,
  context: ConversionContext,
): { type: string; value: JsonValue } | null {
  const { value } = variable;
  const type = variableType(variable, label, context);
  if (type === null) {
    return null;
  }
  if (isUnsupported(value)) {
    context.problems.push(`${label}: 지원하지 않는 값(${value.description})`);
    return null;
  }
  if (isAlias(value)) {
    const alias = aliasValue(value, label, context);
    return alias === null ? null : { type, value: alias };
  }

  const literal = literalValue(type, value);
  if (literal === null) {
    context.problems.push(`${label}: ${type} 값으로 바꿀 수 없는 값이다`);
    return null;
  }
  return { type, value: literal };
}

/**
 * 변수의 `$type`을 값 종류와 이름으로 정한다.
 * @param variable 변수
 * @param label 오류 메시지에 쓸 이름
 * @param context 문제 목록
 * @returns DTCG 타입, 계약에 없는 변수면 null
 */
function variableType(
  variable: VariableInput,
  label: string,
  context: ConversionContext,
): string | null {
  const { name } = variable;
  if (variable.resolvedType === 'COLOR') {
    return 'color';
  }
  if (variable.resolvedType === 'FLOAT') {
    if (name.startsWith('motion/duration/') || name.startsWith('motion/delay/')) {
      return 'duration';
    }
    if (name.startsWith('opacity/') || name.startsWith('motion/scale/')) {
      return 'number';
    }
    return 'dimension';
  }
  if (variable.resolvedType !== 'STRING') {
    context.problems.push(`${label}: ${variable.resolvedType} 변수는 계약에 없다`);
    return null;
  }
  if (name.startsWith('font/family/')) {
    return 'fontFamily';
  }
  if (name.startsWith('font/weight/')) {
    return 'fontWeight';
  }
  if (name.startsWith('motion/easing/')) {
    return 'cubicBezier';
  }
  context.problems.push(`${label}: 이 이름의 ${variable.resolvedType} 변수는 계약에 없다`);
  return null;
}

/**
 * 별칭이 아닌 변수 값을 타입에 맞는 `$value`로 바꾼다.
 * @param type variableType이 정한 타입
 * @param value 변수 값
 * @returns `$value`, 타입과 값이 맞지 않으면 null
 */
function literalValue(type: string, value: boolean | number | string | FigmaColor): JsonValue {
  if (type === 'color') {
    return typeof value === 'object' ? colorToHex(value) : null;
  }
  if (typeof value === 'number') {
    if (type === 'duration') {
      return { value: roundNumber(value), unit: 'ms' };
    }
    if (type === 'number') {
      return roundNumber(value);
    }
    return type === 'dimension' ? dimension(value) : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  if (type === 'fontFamily') {
    return value;
  }
  if (type === 'fontWeight') {
    return fontWeights[value] ?? null;
  }
  return type === 'cubicBezier' ? parseCubicBezier(value) : null;
}

/**
 * 글자 스타일을 typography 토큰으로 바꾼다. 변수에 묶인 속성은 별칭으로 남긴다.
 * @param style 글자 스타일
 * @param context 별칭 이름표와 문제 목록
 * @returns typography 토큰
 */
function textStyleToken(style: TextStyleInput, context: ConversionContext): JsonObject {
  const label = `글자 스타일 ${style.name}`;
  const bound = style.boundVariables;

  /**
   * 속성이 변수에 묶였으면 별칭을, 아니면 직접 값을 쓴다.
   * @param field 글자 스타일 속성
   * @param literal 묶이지 않았을 때의 값
   * @returns 별칭 참조 또는 직접 값
   */
  function boundOr(field: TextStyleField, literal: () => JsonValue | null): JsonValue | null {
    const alias = bound[field];
    return alias === undefined ? literal() : aliasValue(alias, label, context);
  }

  const fontWeightAlias = bound.fontWeight ?? bound.fontStyle;
  const value: JsonObject = {
    fontFamily: boundOr('fontFamily', () => style.fontFamily) ?? '',
    fontWeight:
      (fontWeightAlias === undefined
        ? fontWeightNumber(style.fontStyle, label, context)
        : aliasValue(fontWeightAlias, label, context)) ?? 0,
    fontSize: boundOr('fontSize', () => dimension(style.fontSize)) ?? 0,
    lineHeight: boundOr('lineHeight', () => lineHeightValue(style, label, context)) ?? 0,
    letterSpacing: boundOr('letterSpacing', () => letterSpacingValue(style)) ?? 0,
  };
  return { $type: 'typography', $value: value };
}

/**
 * 줄 높이를 px 치수로 바꾼다. px가 아니면 계약에 없으므로 중단 사유로 남긴다.
 * @param style 글자 스타일
 * @param label 오류 메시지에 쓸 이름
 * @param context 문제 목록
 * @returns px 치수, 바꿀 수 없으면 null
 */
function lineHeightValue(
  style: TextStyleInput,
  label: string,
  context: ConversionContext,
): JsonValue | null {
  if (style.lineHeight.unit !== 'PIXELS') {
    context.problems.push(`${label}: 줄 높이 단위 ${style.lineHeight.unit}는 계약에 없다`);
    return null;
  }
  return dimension(style.lineHeight.value);
}

/**
 * 자간을 px 또는 % 치수로 바꾼다.
 * @param style 글자 스타일
 * @returns 자간 치수
 */
function letterSpacingValue(style: TextStyleInput): JsonValue {
  const { unit, value } = style.letterSpacing;
  return { value: roundNumber(value), unit: unit === 'PIXELS' ? 'px' : '%' };
}

/**
 * 효과 스타일을 shadow 토큰으로 바꾼다. 흐림은 확장 필드에 둔다.
 * 숨긴 효과는 그려지지 않으므로 넣지 않는다.
 * @param style 효과 스타일
 * @param context 별칭 이름표와 문제 목록
 * @returns shadow 토큰
 */
function effectStyleToken(style: EffectStyleInput, context: ConversionContext): JsonObject {
  const label = `효과 스타일 ${style.name}`;
  const shadows: JsonValue[] = [];
  const blurs: JsonObject = {};

  for (const effect of style.effects) {
    if (!effect.visible) {
      continue;
    }
    if (effect.type === 'UNSUPPORTED') {
      context.problems.push(`${label}: 지원하지 않는 효과(${effect.description})`);
    } else if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      shadows.push(shadowValue(effect, label, context));
    } else {
      const key = effect.type === 'BACKGROUND_BLUR' ? 'backgroundBlur' : 'layerBlur';
      if (key in blurs) {
        context.problems.push(`${label}: ${effect.type}가 둘 이상이다`);
      }
      blurs[key] = numberOrAlias(effect.radius, effect.boundVariables.radius, label, context);
    }
  }

  const token: JsonObject = { $type: 'shadow', $value: shadows };
  if (Object.keys(blurs).length > 0) {
    token.$extensions = { [PROJECT_EXTENSION]: blurs };
  }
  return token;
}

/**
 * 그림자 효과 하나를 DTCG shadow 값으로 바꾼다.
 * @param effect 그림자 효과
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns shadow 값 하나
 */
function shadowValue(
  effect: ShadowEffectInput,
  label: string,
  context: ConversionContext,
): JsonObject {
  const bound = effect.boundVariables;
  return {
    color:
      bound.color === undefined
        ? colorToHex(effect.color)
        : aliasValue(bound.color, label, context),
    offsetX: numberOrAlias(effect.offsetX, bound.offsetX, label, context),
    offsetY: numberOrAlias(effect.offsetY, bound.offsetY, label, context),
    blur: numberOrAlias(effect.radius, bound.radius, label, context),
    spread: numberOrAlias(effect.spread, bound.spread, label, context),
    inset: effect.type === 'INNER_SHADOW',
  };
}

/**
 * 칠 스타일을 토큰으로 바꾼다.
 * - 보이는 단색 하나(불투명, NORMAL)면 그 색의 color 토큰이다.
 * - 단색이 있으면 첫 단색을 값으로 둔 color 토큰이고, 모든 층을 확장 필드에 담는다.
 * - 단색이 없고 그라디언트가 있으면 첫 그라디언트의 색 지점을 값으로 둔 gradient 토큰이다.
 * - 단색도 그라디언트도 없으면(이미지만 있는 칠) 토큰이 아니다.
 * @param style 칠 스타일
 * @param context 별칭 이름표와 문제 목록
 * @returns 토큰, 토큰이 아닌 칠 스타일이면 null
 */
function paintStyleToken(style: PaintStyleInput, context: ConversionContext): JsonObject | null {
  const label = `칠 스타일 ${style.name}`;
  const visible = style.paints.filter((paint) => paint.visible);
  for (const paint of visible) {
    checkBoundColors(paint, label, context);
  }
  const [only] = visible;
  if (
    visible.length === 1 &&
    only?.type === 'SOLID' &&
    only.opacity === 1 &&
    only.blendMode === 'NORMAL'
  ) {
    return { $type: 'color', $value: solidColor(only, label, context) };
  }

  const firstSolid = visible.find((paint) => paint.type === 'SOLID');
  const firstGradient = visible.find(isGradient);
  if (firstSolid === undefined && firstGradient === undefined) {
    if (visible.some((paint) => paint.type === 'UNSUPPORTED')) {
      context.problems.push(`${label}: 단색·그라디언트 없이 계약에 없는 칠만 있다`);
    }
    return null;
  }

  const layers: JsonValue[] = [];
  for (const paint of visible) {
    if (paint.type === 'UNSUPPORTED') {
      context.problems.push(`${label}: 계약에 없는 칠(${paint.description})`);
    } else {
      layers.push(paintLayer(paint, label, context));
    }
  }
  const extensions = { [PROJECT_EXTENSION]: { layers } };
  if (firstSolid !== undefined) {
    return {
      $type: 'color',
      $value: solidColor(firstSolid, label, context),
      $extensions: extensions,
    };
  }
  return {
    $type: 'gradient',
    $value: firstGradient === undefined ? [] : gradientStops(firstGradient, label, context),
    $extensions: extensions,
  };
}

/**
 * 칠 스타일 안의 단색 층과 그라디언트 색 지점이 색 변수에 연결되어 있는지 본다. 날값이면 막는다.
 * 재질 칠 스타일처럼 층이 여럿인 스타일도 같다. 코드는 연결된 변수 이름으로 색을 쓴다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param paint 칠 층
 * @param label 오류 메시지에 쓸 이름
 * @param context 문제 목록
 */
function checkBoundColors(paint: PaintInput, label: string, context: ConversionContext): void {
  if (paint.type === 'SOLID' && paint.boundVariables.color === undefined) {
    context.problems.push(
      `${label}: ${paint.blendMode} 단색 층의 색 ${colorToHex(paint.color)}이 변수에 연결되어 있지 않다. 칠 스타일 안의 층 색도 색 변수에 연결한다`,
    );
  }
  if (
    isGradient(paint) &&
    paint.gradientStops.some((stop) => stop.boundVariables.color === undefined)
  ) {
    context.problems.push(
      `${label}: 그라디언트 색 지점이 변수에 연결되어 있지 않다. 칠 스타일 안의 층 색도 색 변수에 연결한다`,
    );
  }
}

/**
 * 칠 층 하나를 확장 필드 값으로 바꾼다. 그 칠 종류에 해당하는 필드만 담는다.
 * @param paint 단색, 그라디언트 또는 이미지 칠
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 층 정보
 */
function paintLayer(
  paint: SolidPaintInput | ImagePaintInput | GradientPaintInput,
  label: string,
  context: ConversionContext,
): JsonObject {
  const layer: JsonObject = {
    type: paint.type,
    opacity: roundNumber(paint.opacity),
    blendMode: paint.blendMode,
  };
  if (paint.type === 'SOLID') {
    layer.color = solidColor(paint, label, context);
    return layer;
  }
  if (paint.type !== 'IMAGE') {
    layer.gradientStops = gradientStops(paint, label, context);
    layer.gradientTransform = paint.gradientTransform.map((row) => row.map(roundNumber));
    return layer;
  }
  layer.imageHash = paint.imageHash;
  // G4: 이미지는 이름 있는 이미지 자산이어야 코드가 같은 파일을 쓴다. 이름 없는 이미지는 막는다.
  const asset = paint.imageHash === null ? undefined : context.imageAssets[paint.imageHash];
  if (asset === undefined) {
    context.problems.push(
      `${label}: 이미지(${paint.imageHash ?? '해시 없음'})가 Foundations / Assets / Images의 자산이 아니다. 이미지를 Images 묶음의 컴포넌트로 만들고 이름을 짓는다(G4)`,
    );
  } else {
    layer.asset = asset;
  }
  layer.scaleMode = paint.scaleMode;
  // scalingFactor는 TILE에서만 쓰인다.
  if (paint.scaleMode === 'TILE' && paint.scalingFactor !== undefined) {
    layer.scalingFactor = roundNumber(paint.scalingFactor);
  }
  return layer;
}

/**
 * 그라디언트 색 지점을 DTCG gradient 값(`[{ color, position }]`)으로 바꾼다.
 * @param paint 그라디언트 칠
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 색 지점 목록
 */
function gradientStops(
  paint: GradientPaintInput,
  label: string,
  context: ConversionContext,
): JsonValue[] {
  return paint.gradientStops.map((stop) => ({
    color: stopColor(stop, label, context),
    position: roundNumber(stop.position),
  }));
}

/**
 * 색 지점의 색을 16진수나 별칭으로 바꾼다.
 * @param stop 그라디언트 색 지점
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 16진수 색 또는 별칭 참조
 */
function stopColor(stop: GradientStopInput, label: string, context: ConversionContext): string {
  const alias = stop.boundVariables.color;
  return alias === undefined ? colorToHex(stop.color) : (aliasValue(alias, label, context) ?? '');
}

/**
 * 칠이 그라디언트인지 확인한다.
 * @param paint 칠
 * @returns 그라디언트면 true
 */
function isGradient(paint: PaintInput): paint is GradientPaintInput {
  return paint.type.startsWith('GRADIENT_');
}

/**
 * 단색 칠의 색을 16진수나 별칭으로 바꾼다.
 * @param paint 단색 칠
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 16진수 색 또는 별칭 참조
 */
function solidColor(paint: SolidPaintInput, label: string, context: ConversionContext): string {
  const alias = paint.boundVariables.color;
  return alias === undefined ? colorToHex(paint.color) : (aliasValue(alias, label, context) ?? '');
}

/**
 * 글꼴 스타일 이름을 숫자 굵기로 바꾼다.
 * @param style 피그마 글꼴 스타일 이름
 * @param label 오류 메시지에 쓸 이름
 * @param context 문제 목록
 * @returns 굵기 숫자, 모르는 이름이면 null
 */
function fontWeightNumber(style: string, label: string, context: ConversionContext): number | null {
  const weight = fontWeights[style];
  if (weight === undefined) {
    context.problems.push(`${label}: 글꼴 굵기 "${style}"는 계약에 없다`);
    return null;
  }
  return weight;
}

/**
 * 변수에 묶였으면 별칭을, 아니면 px 치수를 돌려준다.
 * @param value 직접 값
 * @param alias 묶인 변수
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 별칭 참조 또는 px 치수
 */
function numberOrAlias(
  value: number,
  alias: VariableAlias | undefined,
  label: string,
  context: ConversionContext,
): JsonValue {
  return alias === undefined ? dimension(value) : (aliasValue(alias, label, context) ?? '');
}

/**
 * 별칭이 가리키는 변수 이름을 찾아 참조 문자열로 바꾼다.
 * @param alias 변수 별칭
 * @param label 오류 메시지에 쓸 이름
 * @param context 별칭 이름표와 문제 목록
 * @returns 참조 문자열, 가리키는 변수를 모르면 null
 */
function aliasValue(
  alias: VariableAlias,
  label: string,
  context: ConversionContext,
): string | null {
  const name = context.aliasNames[alias.id];
  if (name === undefined) {
    context.problems.push(`${label}: 별칭이 가리키는 변수 ${alias.id}를 찾을 수 없다`);
    return null;
  }
  return aliasReference(name);
}

/**
 * 스타일 토큰을 `style.<종류>.<이름 경로>`에 넣는다.
 * @param root 토큰 트리
 * @param kind 스타일 종류
 * @param name 스타일 이름(`/`로 경로를 나눈다)
 * @param token 넣을 토큰
 * @param problems 문제 목록
 */
function insertStyle(
  root: JsonObject,
  kind: 'text' | 'effect' | 'paint',
  name: string,
  token: JsonObject,
  problems: string[],
): void {
  insertToken(root, ['style', kind, ...name.split('/')], token, `스타일 ${name}`, problems);
}

/**
 * 경로를 따라 그룹을 만들고 토큰을 넣는다. 경로가 겹치거나 DTCG에서 쓸 수 없는 이름이면 문제로 남긴다.
 * @param root 토큰 트리
 * @param path 그룹 경로와 토큰 이름
 * @param token 넣을 토큰
 * @param label 오류 메시지에 쓸 이름
 * @param problems 문제 목록
 */
function insertToken(
  root: JsonObject,
  path: readonly string[],
  token: JsonObject,
  label: string,
  problems: string[],
): void {
  const invalid = path.find((segment) => segment === '' || /^\$|[.{}]/u.test(segment));
  if (invalid !== undefined) {
    problems.push(`${label}: 경로 조각 "${invalid}"는 토큰 이름으로 쓸 수 없다`);
    return;
  }
  let group = root;
  for (const segment of path.slice(0, -1)) {
    const child = group[segment];
    if (child === undefined) {
      const created: JsonObject = {};
      group[segment] = created;
      group = created;
    } else if (isGroup(child)) {
      group = child;
    } else {
      problems.push(`${label}: 경로가 다른 토큰과 겹친다`);
      return;
    }
  }
  const last = path[path.length - 1] ?? '';
  if (last in group) {
    problems.push(`${label}: 같은 경로에 이미 토큰이나 그룹이 있다`);
    return;
  }
  group[last] = token;
}

/**
 * 토큰이 아닌 그룹 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 그룹이면 true
 */
function isGroup(value: JsonValue): value is JsonObject {
  return (
    value !== null && typeof value === 'object' && !Array.isArray(value) && !('$value' in value)
  );
}

/**
 * 변수 값이 별칭인지 확인한다.
 * @param value 변수 값
 * @returns 별칭이면 true
 */
function isAlias(value: VariableValueInput): value is VariableAlias {
  return typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS';
}

/**
 * 변수 값이 계약에 없는 값인지 확인한다.
 * @param value 변수 값
 * @returns 지원하지 않는 값이면 true
 */
function isUnsupported(value: VariableValueInput): value is UnsupportedValue {
  return typeof value === 'object' && 'type' in value && value.type === 'UNSUPPORTED';
}

/**
 * 숫자를 px 치수로 바꾼다.
 * @param value 숫자
 * @returns `{ value, unit: 'px' }`
 */
function dimension(value: number): JsonObject {
  return { value: roundNumber(value), unit: 'px' };
}

/**
 * 피그마가 float32로 저장해 생긴 잡음(0.14000000059604645)을 소수 넷째 자리에서 정리한다.
 * @param value 숫자
 * @returns 정리한 숫자
 */
function roundNumber(value: number): number {
  return Math.round(value * NUMBER_PRECISION) / NUMBER_PRECISION;
}
