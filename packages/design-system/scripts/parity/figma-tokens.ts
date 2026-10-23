/**
 * 플러그인이 내보낸 figma/tokens.json(DTCG 형식)을 읽는다. 별칭을 따라가 피그마 값을 구하고, 이름 규칙으로
 * CSS 이름을 정한다. 컴포넌트 판정과 토큰 값 비교가 기대값을 여기서 얻는다.
 * 기대값을 tokens.css에서 가져오지 않는다. tokens.css는 사람이 쓰는 파일이라 틀린 값도 스스로 맞다고 판정하기 때문이다.
 * 규칙은 [[피그마 일치 검사:판정 항목]]과 [[피그마 일치 검사:토큰 작성]]에 있다.
 */

import type { Expected, ShadowLayer } from './css-values.ts';
import { parseHex } from './css-values.ts';
import { effectNames, kebabSegment, styleSlug, variableNames } from './rules/token-names.ts';

// 한글 글자 스타일 묶음이다. 라틴 스타일과 같은 변수를 써서 유틸리티를 따로 두지 않는다.
const HANGUL_STYLE_GROUP = 'Hangul';

/** 토큰 하나 */
export type FigmaToken = {
  /** `/`로 이은 경로 */
  path: string;
  type: string;
  value: unknown;
  extensions: Record<string, unknown>;
};

/** 칠 스타일 */
export type PaintStyle =
  | { kind: 'solid'; name: string; cssName: string; token: FigmaToken }
  | { kind: 'gradient'; name: string; cssName: string }
  | { kind: 'material'; name: string; utility: string };

/** 효과 스타일 */
export type EffectStyle = {
  name: string;
  /** 그림자 층(없으면 null)과 CSS 이름. 판정하지 않고 캡처 여백과 표시 없는 요소의 토큰 이름에 쓴다 */
  shadow: { cssName: string; layers: ShadowLayer[] } | null;
  /** 배경 흐림 CSS 이름(없으면 null) */
  backdropBlur: string | null;
  /** 레이어 흐림 CSS 이름(없으면 null) */
  blur: string | null;
};

/** 피그마 토큰 표 */
export type FigmaTokens = {
  variables: ReadonlyMap<string, FigmaToken>;
  paints: ReadonlyMap<string, PaintStyle>;
  effects: ReadonlyMap<string, EffectStyle>;
  /** 글자 스타일 이름 → 유틸리티 이름(한글 스타일은 짝인 라틴 스타일의 이름) */
  texts: ReadonlyMap<string, string>;
};

/**
 * tokens.json을 표로 바꾼다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 * @param json figma/tokens.json을 파싱한 값
 * @returns 토큰 표
 */
export function readFigmaTokens(json: unknown): FigmaTokens {
  if (!isRecord(json)) {
    throw new Error('tokens.json: 최상위는 객체여야 한다.');
  }
  const { style, ...groups } = json;
  const variables = new Map(flatten(groups, []).map((token) => [token.path, token]));
  const styles = isRecord(style) ? style : {};

  const paints = new Map<string, PaintStyle>();
  for (const token of flatten(asRecord(styles.paint), [])) {
    paints.set(token.path, paintStyle(token));
  }
  const tokens: FigmaTokens = { variables, paints, effects: new Map(), texts: new Map() };
  const effects = new Map<string, EffectStyle>();
  for (const token of flatten(asRecord(styles.effect), [])) {
    effects.set(token.path, effectStyle(token, tokens));
  }
  const texts = new Map<string, string>();
  for (const token of flatten(asRecord(styles.text), [])) {
    const segments = token.path.split('/');
    const latin =
      segments[0] === HANGUL_STYLE_GROUP && segments.length > 1 ? segments.slice(1) : segments;
    texts.set(token.path, `type-${latin.map(kebabSegment).join('-')}`);
  }
  return { variables, paints, effects, texts };
}

/**
 * 변수 하나의 CSS 이름 목록(첫 이름이 변수 자신)을 구한다.
 * @param tokens 토큰 표
 * @param path 변수 경로
 * @returns CSS 이름 목록
 */
export function cssNamesOf(tokens: FigmaTokens, path: string): string[] {
  const segments = path.split('/');
  const [group, subgroup, ...rest] = segments;
  const hasFontSize =
    group === 'font' &&
    subgroup === 'line-height' &&
    tokens.variables.has(`font/size/${rest.join('/')}`);
  return variableNames(segments, hasFontSize);
}

/**
 * 디자인 토큰이 가진 CSS 이름을 모두 구한다(변수, 칠 스타일, 효과 스타일).
 * 표시(`data-figma`) 없는 요소가 토큰을 쓰는지 볼 때 쓴다.
 * @codocs [[피그마 일치 검사:짝짓기]]
 * @param tokens 토큰 표
 * @returns CSS 이름
 */
export function tokenCssNames(tokens: FigmaTokens): Set<string> {
  const names = new Set<string>();
  for (const path of tokens.variables.keys()) {
    for (const name of cssNamesOf(tokens, path)) {
      names.add(name);
    }
  }
  for (const paint of tokens.paints.values()) {
    if (paint.kind !== 'material') {
      names.add(paint.cssName);
    }
  }
  for (const effect of tokens.effects.values()) {
    for (const name of [effect.shadow?.cssName, effect.backdropBlur, effect.blur]) {
      if (typeof name === 'string') {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * 별칭이 가리키는 변수 경로를 구한다.
 * @param token 토큰
 * @param token.value 토큰 값
 * @returns 경로, 별칭이 아니면 undefined
 */
export function aliasTarget(token: { value: unknown }): string | undefined {
  const match = typeof token.value === 'string' ? /^\{(.+)\}$/u.exec(token.value) : null;
  return match?.[1]?.split('.').join('/');
}

/**
 * 별칭을 끝까지 따라간 토큰을 구한다.
 * @param tokens 토큰 표
 * @param path 변수 경로
 * @returns 값이 별칭이 아닌 토큰
 */
export function resolveToken(tokens: FigmaTokens, path: string): FigmaToken {
  const seen = new Set<string>();
  let current = tokens.variables.get(path);
  while (current !== undefined) {
    const target = aliasTarget(current);
    if (target === undefined) {
      return current;
    }
    if (seen.has(target)) {
      throw new Error(`tokens.json ${path}: 별칭이 돈다.`);
    }
    seen.add(target);
    current = tokens.variables.get(target);
  }
  throw new Error(`tokens.json에 변수 ${path}가 없다.`);
}

/**
 * 변수의 피그마 값을 CSS 계산값과 비교할 기대값으로 바꾼다(값 변환).
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param tokens 토큰 표
 * @param path 변수 경로
 * @returns 기대값
 */
export function expectedOfVariable(tokens: FigmaTokens, path: string): Expected {
  const token = resolveToken(tokens, path);
  return expectedOfValue(token.type, token.value, path, path.startsWith('opacity/'));
}

/**
 * 토큰 값을 기대값으로 바꾼다.
 * @param type `$type`
 * @param value `$value`(별칭이 아님)
 * @param where 오류 메시지에 쓸 위치
 * @param isOpacity 불투명도 변수(0–100)면 true
 * @returns 기대값
 */
export function expectedOfValue(
  type: string,
  value: unknown,
  where: string,
  isOpacity = false,
): Expected {
  switch (type) {
    case 'color': {
      const rgba = typeof value === 'string' ? parseHex(value) : null;
      if (rgba === null) {
        throw new Error(`${where}: 색 값 ${JSON.stringify(value)}을 읽을 수 없다.`);
      }
      return { kind: 'color', rgba };
    }
    case 'dimension':
      return { kind: 'length', px: pxOf(value, where) };
    case 'duration':
      return { kind: 'ms', value: msOf(value, where) };
    case 'number':
    case 'fontWeight': {
      if (typeof value !== 'number') {
        throw new Error(`${where}: 숫자 값이 아니다.`);
      }
      return { kind: 'number', value: isOpacity ? value / 100 : value };
    }
    case 'cubicBezier': {
      if (
        !Array.isArray(value) ||
        value.length !== 4 ||
        !value.every((n) => typeof n === 'number')
      ) {
        throw new Error(`${where}: 베지어 값이 아니다.`);
      }
      const [x1, y1, x2, y2] = value;
      return { kind: 'bezier', points: [x1 ?? 0, y1 ?? 0, x2 ?? 0, y2 ?? 0] };
    }
    default:
      throw new Error(`${where}: $type ${type}은 값 변환 규칙이 없다.`);
  }
}

/**
 * 길이 값(`{unit: px, value}`)을 px로 읽는다.
 * @param value 토큰 값
 * @param where 오류 메시지에 쓸 위치
 * @returns px
 */
function pxOf(value: unknown, where: string): number {
  if (isRecord(value) && value.unit === 'px' && typeof value.value === 'number') {
    return value.value;
  }
  throw new Error(`${where}: px 길이가 아니다(${JSON.stringify(value)}).`);
}

/**
 * 시간 값(`{unit: ms, value}`)을 ms로 읽는다.
 * @param value 토큰 값
 * @param where 오류 메시지에 쓸 위치
 * @returns ms
 */
function msOf(value: unknown, where: string): number {
  if (isRecord(value) && typeof value.value === 'number') {
    if (value.unit === 'ms') {
      return value.value;
    }
    if (value.unit === 's') {
      return value.value * 1000;
    }
  }
  throw new Error(`${where}: 시간 값이 아니다(${JSON.stringify(value)}).`);
}

/**
 * 칠 스타일 종류를 정한다. 그라데이션, 층이 여럿인 재질, 단색 하나다.
 * @param token 칠 스타일 토큰
 * @returns 칠 스타일
 */
function paintStyle(token: FigmaToken): PaintStyle {
  const slug = styleSlug(token.path);
  const custom = token.extensions['com.seojaewan'];
  const layers = isRecord(custom) ? custom.layers : undefined;
  if (token.type === 'gradient') {
    return { kind: 'gradient', name: token.path, cssName: `--gradient-${slug}` };
  }
  if (layers !== undefined) {
    return { kind: 'material', name: token.path, utility: slug };
  }
  return { kind: 'solid', name: token.path, cssName: `--color-${slug}`, token };
}

/**
 * 효과 스타일의 그림자 층과 흐림 이름을 구한다.
 * @param token 효과 스타일 토큰
 * @param tokens 토큰 표(별칭을 풀 때 쓴다)
 * @returns 효과 스타일
 */
function effectStyle(token: FigmaToken, tokens: FigmaTokens): EffectStyle {
  const names = effectNames(token.path);
  const layers = Array.isArray(token.value) ? token.value : [];
  const custom = token.extensions['com.seojaewan'];
  return {
    name: token.path,
    shadow:
      layers.length === 0
        ? null
        : {
            cssName: names.shadow,
            layers: layers.map((layer: unknown) => shadowLayer(layer, tokens, token.path)),
          },
    backdropBlur:
      isRecord(custom) && custom.backgroundBlur !== undefined ? names.backdropBlur : null,
    blur: isRecord(custom) && custom.layerBlur !== undefined ? names.blur : null,
  };
}

/**
 * 그림자 층 하나를 읽는다. 별칭은 풀어 쓴다.
 * @param layer `{color, offsetX, offsetY, blur, spread, inset}`
 * @param tokens 토큰 표
 * @param where 오류 메시지에 쓸 위치
 * @returns 그림자 층
 */
function shadowLayer(layer: unknown, tokens: FigmaTokens, where: string): ShadowLayer {
  if (!isRecord(layer)) {
    throw new Error(`${where}: 그림자 층이 객체가 아니다.`);
  }
  const color = expectedOfValue('color', resolvedField(layer, 'color', tokens), `${where}/color`);
  if (color.kind !== 'color') {
    throw new Error(`${where}: 그림자 색을 읽을 수 없다.`);
  }
  return {
    rgba: color.rgba,
    x: pxOf(resolvedField(layer, 'offsetX', tokens), `${where}/offsetX`),
    y: pxOf(resolvedField(layer, 'offsetY', tokens), `${where}/offsetY`),
    blur: pxOf(resolvedField(layer, 'blur', tokens), `${where}/blur`),
    spread: pxOf(resolvedField(layer, 'spread', tokens), `${where}/spread`),
    inset: layer.inset === true,
  };
}

/**
 * 그림자 층의 칸 값을 읽는다. 별칭이면 가리키는 토큰 값으로 푼다.
 * @param layer 그림자 층
 * @param field 칸 이름
 * @param tokens 토큰 표
 * @returns 값
 */
function resolvedField(
  layer: Record<string, unknown>,
  field: string,
  tokens: FigmaTokens,
): unknown {
  const raw = layer[field];
  const target = aliasTarget({ value: raw });
  return target === undefined ? raw : resolveToken(tokens, target).value;
}

/**
 * 그룹을 따라 내려가며 `$value`를 가진 토큰을 모은다.
 * @param group 토큰 그룹
 * @param prefix 지금까지의 경로
 * @returns 토큰 목록
 */
function flatten(group: Record<string, unknown>, prefix: readonly string[]): FigmaToken[] {
  const tokens: FigmaToken[] = [];
  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith('$') || !isRecord(child)) {
      continue;
    }
    const path = [...prefix, key];
    if (!('$value' in child)) {
      tokens.push(...flatten(child, path));
      continue;
    }
    tokens.push({
      path: path.join('/'),
      type: typeof child.$type === 'string' ? child.$type : '',
      value: child.$value,
      extensions: isRecord(child.$extensions) ? child.$extensions : {},
    });
  }
  return tokens;
}

/**
 * 객체로 본다(아니면 빈 객체).
 * @param value 값
 * @returns 객체
 */
function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/**
 * 객체인지 본다.
 * @param value 값
 * @returns 배열이 아닌 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
