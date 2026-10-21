/**
 * export.json `layers`(피그마 플러그인이 쓴 레이어 정보)의 타입과 읽기. 계약은 [[피그마 일치 검사:export.json 계약]]이다.
 * 모양이 계약과 다르면 어느 값이 틀렸는지 알려 주고 실패한다.
 */

export type LayerKind = 'frame' | 'text' | 'vector' | 'image';

export type Box = { x: number; y: number; width: number; height: number };

export type Sides = { top: number; right: number; bottom: number; left: number };

export type Corners = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type GradientStop = { position: number; color: string; token?: string };

export type FigmaPaint =
  | { type: 'SOLID'; color: string; token?: string; blendMode?: string }
  | {
      type: 'IMAGE';
      imageHash: string | null;
      scaleMode: string;
      opacity: number;
      blendMode?: string;
    }
  | { type: 'GRADIENT_LINEAR'; stops: GradientStop[]; blendMode?: string }
  | { type: 'OTHER'; paintType: string };

export type FigmaEffect =
  | {
      type: 'DROP_SHADOW' | 'INNER_SHADOW';
      color: string;
      token?: string;
      offsetX: number;
      offsetY: number;
      radius: number;
      spread: number;
    }
  | { type: 'BACKGROUND_BLUR' | 'LAYER_BLUR'; radius: number; token?: string }
  | { type: 'OTHER'; effectType: string };

export type FigmaText = {
  characters: string;
  autoResize: string;
  alignHorizontal: string;
  fontFamily: string[];
  /** 구간마다 다르면 목록 */
  fontWeight: number | number[];
  fontSize: number | number[];
  /** px. 자동이면 `AUTO` */
  lineHeight: number | string | (number | string)[];
  letterSpacing: number | number[];
  textStyle: string[];
  /** 글리프 잉크 영역(변형 루트 기준). 효과가 있는 글자는 없다 */
  ink?: Box;
};

export type FigmaLayer = Box & {
  /** 레이어 경로. 루트는 빈 문자열 */
  path: string;
  kind: LayerKind;
  type: string;
  component?: string;
  opacity?: number;
  absolute?: boolean;
  layoutMode?: string;
  padding?: Sides;
  itemSpacing?: number;
  primaryAxisAlignItems?: string;
  clipsContent?: boolean;
  cornerRadius?: number | Corners;
  fills?: FigmaPaint[];
  fillStyle?: string;
  strokes?: FigmaPaint[];
  strokeWeight?: number | Sides;
  strokeAlign?: string;
  strokeStyle?: string;
  effects?: FigmaEffect[];
  effectStyle?: string;
  /** vector 레이어의 SVG 파일(컴포넌트 폴더 안)과 레이어 상자 기준 영역 */
  svg?: Box & { file: string };
  text?: FigmaText;
};

/**
 * export.json의 `layers`를 읽는다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param value `layers` 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 레이어 목록. 첫 항목이 변형 루트다
 */
export function parseLayers(value: unknown, where: string): FigmaLayer[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where}: 레이어 정보가 없다. 새 피그마 플러그인으로 다시 내보낸다.`);
  }
  const layers = value.map((item: unknown, index) => parseLayer(item, `${where}[${index}]`));
  if (layers[0]?.path !== '') {
    throw new Error(`${where}: 첫 레이어는 변형 루트(path "")여야 한다.`);
  }
  return layers;
}

/**
 * 레이어 하나를 읽는다.
 * @param value 레이어 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 레이어
 */
function parseLayer(value: unknown, where: string): FigmaLayer {
  const raw = record(value, where);
  const kind = string(raw.kind, `${where}.kind`);
  if (kind !== 'frame' && kind !== 'text' && kind !== 'vector' && kind !== 'image') {
    throw new Error(`${where}.kind: frame·text·vector·image 중 하나여야 한다.`);
  }
  const layer: FigmaLayer = {
    path: string(raw.path, `${where}.path`),
    kind,
    type: string(raw.type, `${where}.type`),
    ...box(raw, where),
  };
  assignOptional(layer, raw, where);
  return layer;
}

/**
 * 있으면 읽는 레이어 속성을 채운다.
 * @param layer 채울 레이어
 * @param raw 레이어 값
 * @param where 오류 메시지에 쓸 위치
 */
function assignOptional(layer: FigmaLayer, raw: Record<string, unknown>, where: string): void {
  if (raw.component !== undefined) layer.component = string(raw.component, `${where}.component`);
  if (raw.opacity !== undefined) layer.opacity = number(raw.opacity, `${where}.opacity`);
  if (raw.absolute === true) layer.absolute = true;
  if (raw.layoutMode !== undefined)
    layer.layoutMode = string(raw.layoutMode, `${where}.layoutMode`);
  if (raw.padding !== undefined) layer.padding = sides(raw.padding, `${where}.padding`);
  if (raw.itemSpacing !== undefined)
    layer.itemSpacing = number(raw.itemSpacing, `${where}.itemSpacing`);
  if (raw.primaryAxisAlignItems !== undefined) {
    layer.primaryAxisAlignItems = string(
      raw.primaryAxisAlignItems,
      `${where}.primaryAxisAlignItems`,
    );
  }
  if (raw.clipsContent === true) layer.clipsContent = true;
  if (raw.cornerRadius !== undefined) {
    layer.cornerRadius =
      typeof raw.cornerRadius === 'number'
        ? raw.cornerRadius
        : corners(raw.cornerRadius, `${where}.cornerRadius`);
  }
  if (raw.fills !== undefined) layer.fills = paints(raw.fills, `${where}.fills`);
  if (raw.fillStyle !== undefined) layer.fillStyle = string(raw.fillStyle, `${where}.fillStyle`);
  if (raw.strokes !== undefined) layer.strokes = paints(raw.strokes, `${where}.strokes`);
  if (raw.strokeWeight !== undefined) {
    layer.strokeWeight =
      typeof raw.strokeWeight === 'number'
        ? raw.strokeWeight
        : sides(raw.strokeWeight, `${where}.strokeWeight`);
  }
  if (raw.strokeAlign !== undefined)
    layer.strokeAlign = string(raw.strokeAlign, `${where}.strokeAlign`);
  if (raw.strokeStyle !== undefined)
    layer.strokeStyle = string(raw.strokeStyle, `${where}.strokeStyle`);
  if (raw.effects !== undefined) layer.effects = effects(raw.effects, `${where}.effects`);
  if (raw.effectStyle !== undefined)
    layer.effectStyle = string(raw.effectStyle, `${where}.effectStyle`);
  if (raw.svg !== undefined) {
    const svg = record(raw.svg, `${where}.svg`);
    layer.svg = { file: string(svg.file, `${where}.svg.file`), ...box(svg, `${where}.svg`) };
  }
  if (raw.text !== undefined) layer.text = text(raw.text, `${where}.text`);
}

/**
 * 칠 목록을 읽는다.
 * @param value 칠 목록 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 칠 목록
 */
function paints(value: unknown, where: string): FigmaPaint[] {
  return array(value, where).map((item, index) => paint(item, `${where}[${index}]`));
}

/**
 * 칠 하나를 읽는다. 단색·이미지·선형 그라데이션 밖의 칠은 종류만 남긴다.
 * @param item 칠 값
 * @param at 오류 메시지에 쓸 위치
 * @returns 칠
 */
function paint(item: unknown, at: string): FigmaPaint {
  const raw = record(item, at);
  const type = string(raw.type, `${at}.type`);
  const blend = raw.blendMode === undefined ? {} : { blendMode: string(raw.blendMode, at) };
  if (type === 'SOLID') {
    return { type, color: string(raw.color, `${at}.color`), ...token(raw, at), ...blend };
  }
  if (type === 'IMAGE') {
    return {
      type,
      imageHash: raw.imageHash === null ? null : string(raw.imageHash, `${at}.imageHash`),
      scaleMode: string(raw.scaleMode, `${at}.scaleMode`),
      opacity: number(raw.opacity, `${at}.opacity`),
      ...blend,
    };
  }
  if (type === 'GRADIENT_LINEAR') {
    return {
      type,
      stops: array(raw.stops, `${at}.stops`).map((stop, index) =>
        gradientStop(stop, `${at}.stops[${index}]`),
      ),
      ...blend,
    };
  }
  return { type: 'OTHER', paintType: type };
}

/**
 * 그라데이션 색 지점 하나를 읽는다.
 * @param value 색 지점 값
 * @param at 오류 메시지에 쓸 위치
 * @returns 색 지점
 */
function gradientStop(value: unknown, at: string): GradientStop {
  const raw = record(value, at);
  return {
    position: number(raw.position, `${at}.position`),
    color: string(raw.color, `${at}.color`),
    ...token(raw, at),
  };
}

/**
 * 효과 목록을 읽는다.
 * @param value 효과 목록 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 효과 목록
 */
function effects(value: unknown, where: string): FigmaEffect[] {
  return array(value, where).map((item, index) => effect(item, `${where}[${index}]`));
}

/**
 * 효과 하나를 읽는다. 그림자와 블러 밖의 효과는 종류만 남긴다.
 * @param item 효과 값
 * @param at 오류 메시지에 쓸 위치
 * @returns 효과
 */
function effect(item: unknown, at: string): FigmaEffect {
  const raw = record(item, at);
  const type = string(raw.type, `${at}.type`);
  if (type === 'DROP_SHADOW' || type === 'INNER_SHADOW') {
    return {
      type,
      color: string(raw.color, `${at}.color`),
      ...token(raw, at),
      offsetX: number(raw.offsetX, `${at}.offsetX`),
      offsetY: number(raw.offsetY, `${at}.offsetY`),
      radius: number(raw.radius, `${at}.radius`),
      spread: number(raw.spread, `${at}.spread`),
    };
  }
  if (type === 'BACKGROUND_BLUR' || type === 'LAYER_BLUR') {
    return { type, radius: number(raw.radius, `${at}.radius`), ...token(raw, at) };
  }
  return { type: 'OTHER', effectType: type };
}

/**
 * 글자 정보를 읽는다.
 * @param value 글자 정보 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 글자 정보
 */
function text(value: unknown, where: string): FigmaText {
  const raw = record(value, where);
  const result: FigmaText = {
    characters: string(raw.characters, `${where}.characters`),
    autoResize: string(raw.autoResize, `${where}.autoResize`),
    alignHorizontal: string(raw.alignHorizontal, `${where}.alignHorizontal`),
    fontFamily: array(raw.fontFamily, `${where}.fontFamily`).map((item) =>
      string(item, `${where}.fontFamily`),
    ),
    fontWeight: numbers(raw.fontWeight, `${where}.fontWeight`),
    fontSize: numbers(raw.fontSize, `${where}.fontSize`),
    lineHeight: lineHeights(raw.lineHeight, `${where}.lineHeight`),
    letterSpacing: numbers(raw.letterSpacing, `${where}.letterSpacing`),
    textStyle: array(raw.textStyle ?? [], `${where}.textStyle`).map((item) =>
      string(item, `${where}.textStyle`),
    ),
  };
  if (raw.ink !== undefined) {
    result.ink = box(record(raw.ink, `${where}.ink`), `${where}.ink`);
  }
  return result;
}

/**
 * 숫자 하나 또는 숫자 목록을 읽는다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 숫자 또는 목록
 */
function numbers(value: unknown, where: string): number | number[] {
  return Array.isArray(value)
    ? value.map((item: unknown) => number(item, where))
    : number(value, where);
}

/**
 * 줄 높이(px 또는 `AUTO`) 하나 또는 목록을 읽는다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 줄 높이 또는 목록
 */
function lineHeights(value: unknown, where: string): number | string | (number | string)[] {
  /**
   * 줄 높이 하나를 읽는다.
   * @param item 값
   * @returns px 또는 `AUTO`
   */
  function one(item: unknown): number | string {
    return typeof item === 'string' ? item : number(item, where);
  }
  return Array.isArray(value) ? value.map(one) : one(value);
}

/**
 * 토큰 별칭이 있으면 읽는다.
 * @param raw 칠·효과 값
 * @param where 오류 메시지에 쓸 위치
 * @returns `{ token }` 또는 빈 객체
 */
function token(raw: Record<string, unknown>, where: string): { token?: string } {
  return raw.token === undefined ? {} : { token: string(raw.token, `${where}.token`) };
}

/**
 * 상자 값을 읽는다.
 * @param raw 상자를 담은 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 상자
 */
function box(raw: Record<string, unknown>, where: string): Box {
  return {
    x: number(raw.x, `${where}.x`),
    y: number(raw.y, `${where}.y`),
    width: number(raw.width, `${where}.width`),
    height: number(raw.height, `${where}.height`),
  };
}

/**
 * 네 변 값을 읽는다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 네 변 값
 */
function sides(value: unknown, where: string): Sides {
  const raw = record(value, where);
  return {
    top: number(raw.top, `${where}.top`),
    right: number(raw.right, `${where}.right`),
    bottom: number(raw.bottom, `${where}.bottom`),
    left: number(raw.left, `${where}.left`),
  };
}

/**
 * 네 모서리 반경을 읽는다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 네 모서리 반경
 */
function corners(value: unknown, where: string): Corners {
  const raw = record(value, where);
  return {
    topLeft: number(raw.topLeft, `${where}.topLeft`),
    topRight: number(raw.topRight, `${where}.topRight`),
    bottomRight: number(raw.bottomRight, `${where}.bottomRight`),
    bottomLeft: number(raw.bottomLeft, `${where}.bottomLeft`),
  };
}

/**
 * 객체인지 확인한다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 객체
 */
function record(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: 객체여야 한다.`);
  }
  return Object.fromEntries(Object.entries(value));
}

/**
 * 배열인지 확인한다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 배열
 */
function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${where}: 배열이어야 한다.`);
  }
  return value.map((item: unknown) => item);
}

/**
 * 유한한 숫자인지 확인한다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 숫자
 */
function number(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${where}: 숫자여야 한다.`);
  }
  return value;
}

/**
 * 문자열인지 확인한다.
 * @param value 값
 * @param where 오류 메시지에 쓸 위치
 * @returns 문자열
 */
function string(value: unknown, where: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${where}: 문자열이어야 한다.`);
  }
  return value;
}
