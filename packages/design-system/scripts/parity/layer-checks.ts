/**
 * export.json의 레이어 정보를 코드에서 확인할 항목으로 바꾼다. 판정 항목 표에 있는 것만 만든다.
 * 항목마다 읽을 CSS 속성과, 이긴 선언이 가리켜야 할 변수 이름(이름), 계산값 기대(값·대응)를 담는다.
 * 기대값은 tokens.json의 피그마 값에서 만든다. 브라우저에서 읽고 비교하는 일은 page-checks.ts와 parity-runner.ts가 맡는다.
 * 규칙은 [[피그마 일치 검사:판정 항목]]에 있다.
 */

import type { Expected } from './css-values.ts';
import {
  aliasTarget,
  cssNamesOf,
  expectedOfValue,
  expectedOfVariable,
  type FigmaTokens,
} from './figma-tokens.ts';
import { parityDecisions } from './rules/decisions.ts';
import { choiceValues } from './rules/one-to-one.ts';
import type { TransitionCheck } from './transition-checks.ts';

/** 확인 항목 하나(요소 하나의 CSS 속성 하나) */
export type PropertyCheck = {
  /** 레이어 경로. 루트는 빈 문자열 */
  layer: string;
  /** 역할 이름(실패 메시지, 전환에서 바뀐 역할을 찾는 열쇠) */
  role: string;
  /** 피그마 쪽 이름이나 값(실패 메시지, 전환에서 바뀌었는지 비교) */
  figma: string;
  /** 계산값을 읽을 CSS 속성(롱핸드) */
  property: string;
  /** 이름 비교: 이긴 선언이 가리켜야 할 CSS 변수 이름 후보 */
  variables?: string[];
  /** 값·대응 비교: 계산값 기대 */
  expected?: Expected;
  /** 상속되는 속성이라 조상의 선언도 인정한다 */
  inherited?: boolean;
  /** 의사 요소(`::placeholder`) */
  pseudo?: string;
};

/** 레이어가 없는 확인 항목(글자 구간, 자산 색) */
export type ElementCheck = Omit<PropertyCheck, 'layer'>;

/** 글자 구간 하나 */
export type SegmentCheck = {
  start: number;
  end: number;
  /** 피그마 글자 스타일 이름(메시지용) */
  textStyle: string;
  /** 피그마 구간 서체(글자마다 실제로 그린 서체와 비교) */
  fontFamily: string;
  checks: ElementCheck[];
};

/** 글자 레이어 */
export type TextCheck = {
  layer: string;
  characters: string;
  segments: SegmentCheck[];
};

/** 자산 레이어 */
export type AssetCheck = {
  layer: string;
  /** 자산 파일(figma/assets/ 기준). 코드 요소의 data-asset 값과 같아야 한다 */
  file: string;
  color: ElementCheck | null;
};

/** 변형 하나(또는 BOOLEAN 경우 하나)의 확인 항목 */
export type VariantChecks = {
  /** 레이어 경로(루트는 빈 문자열) */
  layers: string[];
  /** 슬롯 레이어 경로. 슬롯 안쪽 내용은 비교하지 않는다 */
  slots: string[];
  hidden: string[];
  checks: PropertyCheck[];
  texts: TextCheck[];
  assets: AssetCheck[];
  /** 비교할 수 없는 레이어 정보(규칙 없음). 실패로 다룬다 */
  unsupported: { layer: string; message: string }[];
  /** 이 변형으로 들어오는 상태 전환. parity-plan이 채운다 */
  transitions: TransitionCheck[];
};

type JsonRecord = Record<string, unknown>;

type LayerContext = {
  path: string;
  layer: JsonRecord;
  tokens: FigmaTokens;
  result: VariantChecks;
};

// 피그마 변의 이름 → CSS 변 이름
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const CORNERS = [
  ['topLeft', 'top-left'],
  ['topRight', 'top-right'],
  ['bottomRight', 'bottom-right'],
  ['bottomLeft', 'bottom-left'],
] as const;
const transparent: Expected = { kind: 'color', rgba: [0, 0, 0, 0] };

/**
 * 변형 하나의 레이어 목록을 확인 항목으로 바꾼다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param layers export.json의 layers
 * @param hidden export.json의 hidden
 * @param tokens tokens.json 토큰 표
 * @returns 확인 항목
 */
export function variantChecks(
  layers: readonly unknown[],
  hidden: readonly string[],
  tokens: FigmaTokens,
): VariantChecks {
  const result: VariantChecks = {
    layers: [],
    slots: [],
    hidden: [...hidden],
    checks: [],
    texts: [],
    assets: [],
    unsupported: [],
    transitions: [],
  };
  for (const layer of layers.filter(isRecord)) {
    const path = stringOf(layer.path);
    result.layers.push(path);
    const context: LayerContext = { path, layer, tokens, result };
    try {
      layerChecks(context);
    } catch (error) {
      result.unsupported.push({
        layer: path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}

/**
 * 레이어 하나의 확인 항목을 더한다.
 * @param context 레이어와 결과
 */
function layerChecks(context: LayerContext): void {
  const { layer, result, path } = context;
  const type = stringOf(layer.type);
  if (type === 'SLOT') {
    result.slots.push(path);
  }
  sizingChecks(context);
  if (isRecord(layer.asset)) {
    assetCheck(context, layer.asset);
    return;
  }
  layoutChecks(context);
  if (type === 'SLOT') {
    return;
  }
  if (isRecord(layer.text)) {
    textChecks(context, layer.text);
  } else {
    paintChecks(context);
    strokeChecks(context);
    radiusChecks(context);
    effectChecks(context);
  }
  miscChecks(context);
}

/**
 * 변수 하나로 이름 + 값 확인 항목을 만든다.
 * @param context 레이어와 결과
 * @param role 역할 이름
 * @param property CSS 속성
 * @param variable 피그마 변수 경로
 * @param extra 더할 칸(상속, 의사 요소)
 * @returns 확인 항목(레이어 없음)
 */
function variableCheck(
  context: Pick<LayerContext, 'tokens'>,
  role: string,
  property: string,
  variable: string,
  extra: Partial<ElementCheck> = {},
): ElementCheck {
  return {
    role,
    figma: variable,
    property,
    variables: cssNamesOf(context.tokens, variable),
    expected: expectedOfVariable(context.tokens, variable),
    ...extra,
  };
}

/**
 * 고정 크기(FIXED 축의 크기 변수)와 최소·최대 크기를 확인한다. HUG·FILL은 판정하지 않는다.
 * @param context 레이어와 결과
 */
function sizingChecks(context: LayerContext): void {
  const sizing = isRecord(context.layer.sizing) ? context.layer.sizing : {};
  for (const [axis, dimension, label] of [
    ['horizontal', 'width', '너비'],
    ['vertical', 'height', '높이'],
  ] as const) {
    if (stringOf(sizing[axis]) !== 'FIXED') {
      continue;
    }
    const variable = sizing[dimension];
    if (typeof variable !== 'string') {
      throw new Error(`${label}가 크기 변수에 연결되어 있지 않다`);
    }
    add(context, variableCheck(context, label, dimension, variable));
  }
  for (const key of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const) {
    const variable = sizing[key];
    if (variable === undefined) {
      continue;
    }
    if (typeof variable !== 'string') {
      throw new Error(`${key}가 크기 변수에 연결되어 있지 않다`);
    }
    const property = key.replace(/[A-Z]/u, (letter) => `-${letter.toLowerCase()}`);
    add(context, variableCheck(context, property, property, variable));
  }
}

/**
 * 자동 배치(방향, 정렬, 줄바꿈, 여백, 간격)를 확인한다.
 * @param context 레이어와 결과
 */
function layoutChecks(context: LayerContext): void {
  const layout = isRecord(context.layer.layout) ? context.layer.layout : null;
  if (layout === null) {
    return;
  }
  const mode = stringOf(layout.mode);
  if (mode !== 'HORIZONTAL' && mode !== 'VERTICAL') {
    throw new Error(`자동 배치 방향 ${mode}의 대응이 없다`);
  }
  add(context, keywordCheck('자동 배치', mode, 'display', choice('display', 'AUTO_LAYOUT')));
  add(context, keywordCheck('배치 방향', mode, 'flex-direction', choice('flexDirection', mode)));
  const primary = stringOf(layout.primaryAlign);
  add(
    context,
    keywordCheck('주축 정렬', primary, 'justify-content', choice('primaryAlign', primary)),
  );
  const counter = stringOf(layout.counterAlign);
  add(
    context,
    keywordCheck('교차축 정렬', counter, 'align-items', choice('counterAlign', counter)),
  );
  const wrap = stringOf(layout.wrap) || 'NO_WRAP';
  add(context, keywordCheck('줄바꿈', wrap, 'flex-wrap', choice('wrap', wrap)));
  const padding = isRecord(layout.padding) ? layout.padding : {};
  for (const side of SIDES) {
    const variable = padding[side];
    if (typeof variable === 'string') {
      add(context, variableCheck(context, `여백(${side})`, `padding-${side}`, variable));
    }
  }
  for (const key of ['gap', 'counterGap'] as const) {
    const variable = layout[key];
    if (typeof variable !== 'string') {
      continue;
    }
    const isColumn = (mode === 'HORIZONTAL') === (key === 'gap');
    add(
      context,
      variableCheck(
        context,
        key === 'gap' ? '간격' : '줄 간격',
        isColumn ? 'column-gap' : 'row-gap',
        variable,
      ),
    );
  }
}

/**
 * 칠을 확인한다. 단색은 이름 + 값, 그라데이션 칠 스타일은 이름, 재질 칠 스타일은 판정하지 않는다.
 * 칠이 없으면 배경이 없어야 한다.
 * @param context 레이어와 결과
 */
function paintChecks(context: LayerContext): void {
  const { layer, tokens } = context;
  const fill = isRecord(layer.fill) ? layer.fill : null;
  if (fill === null) {
    add(context, {
      role: '채우기',
      figma: '없음',
      property: 'background-color',
      expected: transparent,
    });
    add(context, keywordCheck('채우기(이미지)', '없음', 'background-image', ['none']));
    return;
  }
  if (typeof fill.variable === 'string') {
    add(context, variableCheck(context, '채우기', 'background-color', fill.variable));
    return;
  }
  const style = stringOf(fill.style);
  const paint = tokens.paints.get(style);
  if (paint === undefined) {
    throw new Error(`칠 스타일 ${style}이 tokens.json에 없다`);
  }
  if (paint.kind === 'material') {
    // 재질 칠 스타일은 층을 어떻게 겹칠지가 선택이라 판정하지 않는다(캡처 표에서 본다).
    return;
  }
  if (paint.kind === 'gradient') {
    add(context, {
      role: '채우기(그라데이션)',
      figma: style,
      property: 'background-image',
      variables: [paint.cssName],
    });
    return;
  }
  add(context, {
    role: '채우기',
    figma: style,
    property: 'background-color',
    variables: [paint.cssName],
    expected: paintExpected(tokens, paint.token),
  });
}

/**
 * 선을 확인한다. 바깥 선은 outline, 레이아웃에 포함한 안쪽 선은 border로 이름 + 값을 본다.
 * 그 밖의 선(레이아웃에 포함하지 않은 안쪽 선, 가운데 선)은 판정하지 않고, outline과 border가 없어야 한다.
 * @param context 레이어와 결과
 */
function strokeChecks(context: LayerContext): void {
  const stroke = isRecord(context.layer.stroke) ? context.layer.stroke : null;
  const align = stroke === null ? '' : stringOf(stroke.align);
  const isOutside = align === 'OUTSIDE';
  const isLayoutBorder = align === 'INSIDE' && stroke?.includedInLayout === true;
  if (!isOutside) {
    add(context, keywordCheck('바깥 선', '없음', 'outline-style', ['none']));
  }
  if (!isLayoutBorder) {
    for (const side of SIDES) {
      add(context, {
        role: `레이아웃 선 두께(${side})`,
        figma: '없음',
        property: `border-${side}-width`,
        expected: { kind: 'length', px: 0 },
      });
    }
  }
  if (stroke === null || (!isOutside && !isLayoutBorder)) {
    return;
  }
  const paint = isRecord(stroke.paint) ? stroke.paint : {};
  if (typeof paint.variable !== 'string') {
    throw new Error(
      `칠 스타일(${stringOf(paint.style)})을 쓴 ${isOutside ? '바깥 선' : '레이아웃 선'}은 대응이 없다`,
    );
  }
  const weight = isRecord(stroke.weight) ? stroke.weight : {};
  if (isOutside) {
    const weights = new Set(Object.values(weight));
    const [variable] = weights;
    if (weights.size !== 1 || typeof variable !== 'string') {
      throw new Error('변마다 다른 바깥 선 두께는 대응이 없다');
    }
    add(context, keywordCheck('바깥 선', 'OUTSIDE', 'outline-style', ['solid']));
    add(context, {
      role: '바깥 선 간격',
      figma: '0',
      property: 'outline-offset',
      expected: { kind: 'length', px: 0 },
    });
    add(context, variableCheck(context, '바깥 선 색', 'outline-color', paint.variable));
    add(context, variableCheck(context, '바깥 선 두께', 'outline-width', variable));
    return;
  }
  for (const side of SIDES) {
    const variable = weight[side];
    if (typeof variable !== 'string') {
      throw new Error(`레이아웃 선 두께(${side})가 변수에 연결되어 있지 않다`);
    }
    add(context, keywordCheck(`레이아웃 선(${side})`, 'INSIDE', `border-${side}-style`, ['solid']));
    add(
      context,
      variableCheck(context, `레이아웃 선 색(${side})`, `border-${side}-color`, paint.variable),
    );
    add(
      context,
      variableCheck(context, `레이아웃 선 두께(${side})`, `border-${side}-width`, variable),
    );
  }
}

/**
 * 모서리 반경을 확인한다. 원(ELLIPSE)은 판정하지 않는다.
 * @param context 레이어와 결과
 */
function radiusChecks(context: LayerContext): void {
  if (context.layer.type === 'ELLIPSE') {
    return;
  }
  const radius = isRecord(context.layer.radius) ? context.layer.radius : {};
  for (const [key, css] of CORNERS) {
    const variable = radius[key];
    if (typeof variable === 'string') {
      add(context, variableCheck(context, `모서리 반경(${css})`, `border-${css}-radius`, variable));
    } else {
      add(context, {
        role: `모서리 반경(${css})`,
        figma: '없음',
        property: `border-${css}-radius`,
        expected: { kind: 'length', px: 0 },
      });
    }
  }
}

/**
 * 효과 스타일의 배경 흐림을 이름으로 확인한다. 효과가 없거나 배경 흐림이 없으면 `backdrop-filter: none`이어야 한다.
 * 그림자는 판정하지 않는다. Tailwind 그림자 유틸리티는 값을 펼쳐 써서 변수 이름이 남지 않기 때문이다.
 * @param context 레이어와 결과
 */
function effectChecks(context: LayerContext): void {
  const { layer, tokens } = context;
  const style = typeof layer.effect === 'string' ? layer.effect : null;
  const effect = style === null ? undefined : tokens.effects.get(style);
  if (style !== null && effect === undefined) {
    throw new Error(`효과 스타일 ${style}이 tokens.json에 없다`);
  }
  if (effect?.backdropBlur !== undefined && effect.backdropBlur !== null) {
    add(context, {
      role: '효과(배경 흐림)',
      figma: style ?? '',
      property: 'backdrop-filter',
      variables: [effect.backdropBlur],
    });
  } else {
    add(context, keywordCheck('효과(배경 흐림)', style ?? '없음', 'backdrop-filter', ['none']));
  }
}

/**
 * 불투명도, 회전, 내용 자르기를 확인한다. 블렌드 모드는 판정하지 않는다.
 * @param context 레이어와 결과
 */
function miscChecks(context: LayerContext): void {
  const { layer } = context;
  if (typeof layer.opacity === 'string') {
    add(context, variableCheck(context, '불투명도', 'opacity', layer.opacity));
  } else {
    add(context, {
      role: '불투명도',
      figma: '1',
      property: 'opacity',
      expected: { kind: 'number', value: 1 },
    });
  }
  const rotation = typeof layer.rotation === 'number' ? layer.rotation : 0;
  if (rotation !== 0) {
    if (!(String(rotation) in parityDecisions.d9.allowedRotations)) {
      throw new Error(`회전 ${String(rotation)}°는 대응이 없다(D9)`);
    }
    // 피그마 각도는 반시계 방향이 양수다. CSS는 시계 방향이 양수다.
    add(context, {
      role: '회전',
      figma: `${String(rotation)}°`,
      property: 'rotate|transform',
      expected: { kind: 'angle', deg: -rotation },
    });
  }
  if (isRecord(layer.layout)) {
    const isClipped = layer.clipsContent === true;
    add(
      context,
      keywordCheck(
        '내용 자르기',
        isClipped ? '켬' : '끔',
        'overflow-x',
        choice('clip', isClipped ? 'ON' : 'OFF'),
      ),
    );
  }
}

/**
 * 글자 레이어(가로 정렬, 내용, 구간마다 색·크기·굵기·자간·줄 높이·꾸밈, 서체)를 확인한다.
 * @param context 레이어와 결과
 * @param text export.json의 text
 */
function textChecks(context: LayerContext, text: JsonRecord): void {
  const align = stringOf(text.alignHorizontal) || 'LEFT';
  add(context, keywordCheck('글자 가로 정렬', align, 'text-align', choice('textAlign', align)));
  const segments = Array.isArray(text.segments) ? text.segments.filter(isRecord) : [];
  context.result.texts.push({
    layer: context.path,
    characters: stringOf(text.characters),
    segments: segments.map((segment) => segmentCheck(context, segment)),
  });
}

/**
 * 글자 구간 하나의 확인 항목을 만든다.
 * @param context 레이어와 결과
 * @param segment export.json의 구간
 * @returns 구간 확인 항목
 */
function segmentCheck(context: LayerContext, segment: JsonRecord): SegmentCheck {
  const style = isRecord(segment.style) ? segment.style : {};
  const checks: ElementCheck[] = [];
  const fill = isRecord(segment.fill) ? segment.fill : null;
  if (fill !== null) {
    if (typeof fill.variable !== 'string') {
      throw new Error('칠 스타일을 쓴 글자 구간은 대응이 없다');
    }
    checks.push(variableCheck(context, '글자 색', 'color', fill.variable, { inherited: true }));
  }
  const fontSize = styleVariable(style, 'fontSize');
  let fontSizePx: number | undefined;
  if (fontSize !== undefined) {
    const check = variableCheck(context, '글자 크기', 'font-size', fontSize, { inherited: true });
    fontSizePx = check.expected?.kind === 'length' ? check.expected.px : undefined;
    checks.push(check);
  }
  const fontWeight = styleVariable(style, 'fontWeight');
  if (fontWeight !== undefined) {
    checks.push(
      variableCheck(context, '글자 굵기', 'font-weight', fontWeight, { inherited: true }),
    );
  }
  const lineHeight = styleVariable(style, 'lineHeight');
  if (lineHeight !== undefined) {
    checks.push(variableCheck(context, '줄 높이', 'line-height', lineHeight, { inherited: true }));
  }
  const spacing = letterSpacingCheck(context, style, fontSizePx);
  if (spacing !== null) {
    checks.push(spacing);
  }
  const decoration = stringOf(segment.textDecoration) || 'NONE';
  checks.push(
    keywordCheck(
      '글자 꾸밈',
      decoration,
      'text-decoration-line',
      choice('textDecoration', decoration),
    ),
  );
  return {
    start: typeof segment.start === 'number' ? segment.start : 0,
    end: typeof segment.end === 'number' ? segment.end : 0,
    textStyle: stringOf(segment.textStyle),
    fontFamily: stringOf(segment.fontFamily),
    checks,
  };
}

/**
 * 자간 확인 항목을 만든다. 변수면 이름 + 값, 값이면 값이다. 피그마 %는 글자 크기의 백분율이다.
 * @param context 레이어와 결과
 * @param style 구간 글자 스타일
 * @param fontSizePx 구간 글자 크기(px)
 * @returns 확인 항목, 자간이 없으면 null
 */
function letterSpacingCheck(
  context: LayerContext,
  style: JsonRecord,
  fontSizePx: number | undefined,
): ElementCheck | null {
  const entry = isRecord(style.letterSpacing) ? style.letterSpacing : null;
  if (entry === null) {
    return null;
  }
  if (typeof entry.variable === 'string') {
    return variableCheck(context, '자간', 'letter-spacing', entry.variable, { inherited: true });
  }
  const match = /^(-?[\d.]+(?:e-?\d+)?)(%|px)$/u.exec(stringOf(entry.value));
  if (match?.[1] === undefined) {
    throw new Error(`자간 ${JSON.stringify(entry.value)}을 읽을 수 없다`);
  }
  const number = Number.parseFloat(match[1]);
  if (match[2] === '%' && fontSizePx === undefined && number !== 0) {
    throw new Error('글자 크기를 몰라 % 자간을 px로 바꿀 수 없다');
  }
  const px = match[2] === 'px' ? number : ((fontSizePx ?? 0) * number) / 100;
  return {
    role: '자간',
    figma: stringOf(entry.value),
    property: 'letter-spacing',
    expected: { kind: 'length', px },
    inherited: true,
  };
}

/**
 * 자산 레이어 확인 항목을 더한다. 한 가지 색 자산은 글자 색을 이름 + 값으로 본다.
 * @param context 레이어와 결과
 * @param asset export.json의 asset
 */
function assetCheck(context: LayerContext, asset: JsonRecord): void {
  const color = typeof asset.color === 'string' ? asset.color : null;
  if (asset.kind === 'mono' && color === null) {
    throw new Error('한 가지 색 자산의 색이 없다(D6)');
  }
  context.result.assets.push({
    layer: context.path,
    file: stringOf(asset.file),
    color:
      color === null
        ? null
        : variableCheck(context, '자산 색', 'color', color, { inherited: true }),
  });
}

/**
 * 칠 스타일(단색 하나)의 기대 색을 구한다.
 * @param tokens 토큰 표
 * @param token 칠 스타일 토큰
 * @param token.value 토큰 값
 * @returns 기대값
 */
function paintExpected(tokens: FigmaTokens, token: { value: unknown }): Expected {
  const target = aliasTarget(token);
  return target === undefined
    ? expectedOfValue('color', token.value, '칠 스타일')
    : expectedOfVariable(tokens, target);
}

/**
 * 대응 확인 항목(같은 뜻의 CSS 값 목록)을 만든다.
 * @param role 역할 이름
 * @param figma 피그마 선택지
 * @param property CSS 속성
 * @param values 같은 뜻의 CSS 값
 * @returns 확인 항목(레이어 없음)
 */
function keywordCheck(
  role: string,
  figma: string,
  property: string,
  values: readonly string[],
): ElementCheck {
  return { role, figma, property, expected: { kind: 'keywords', values } };
}

/**
 * 대응표에서 선택지의 CSS 값을 찾는다.
 * @param table 대응표 이름
 * @param value 피그마 선택지
 * @returns 같은 뜻의 CSS 값
 */
function choice(table: Parameters<typeof choiceValues>[0], value: string): readonly string[] {
  const values = choiceValues(table, value);
  if (values === undefined) {
    throw new Error(`${table} ${value}의 대응이 없다`);
  }
  return values;
}

/**
 * 글자 스타일 속성에 연결된 변수 경로를 읽는다.
 * @param style 구간 글자 스타일
 * @param key 속성 이름
 * @returns 변수 경로(없으면 undefined)
 */
function styleVariable(style: JsonRecord, key: string): string | undefined {
  const entry = style[key];
  return isRecord(entry) && typeof entry.variable === 'string' ? entry.variable : undefined;
}

/**
 * 확인 항목을 더한다.
 * @param context 레이어와 결과
 * @param check 레이어 경로를 뺀 항목
 */
function add(context: LayerContext, check: ElementCheck): void {
  context.result.checks.push({ layer: context.path, ...check });
}

/**
 * 객체인지 확인한다.
 * @param value 값
 * @returns 배열이 아닌 객체면 true
 */
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 문자열이면 그대로, 아니면 빈 문자열을 돌려준다.
 * @param value 값
 * @returns 문자열
 */
function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
