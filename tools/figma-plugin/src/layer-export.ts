import { colorToHex, type FigmaColor } from './color';
import { aliasReference } from './design-tokens';
import type { JsonObject, JsonValue } from './stable-json';

// 변형 하나의 레이어 정보를 export.json의 `layers`로 바꾸는 순수 변환이다.
// 피그마 API를 읽는 부분은 figma-reader.ts가 맡고, 여기서는 고르는 규칙, 종류, 출력 모양만 정한다.

/** 소수 넷째 자리까지 남긴다. design-tokens.ts와 같은 정밀도다. */
const NUMBER_PRECISION = 10_000;

/** 그 자체로 벡터 도형인 종류. 따로 있으면 vector 레이어다. */
const vectorTypes = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'POLYGON']);

/** 사각형·타원. 따로 있으면 값으로 비교하는 frame 레이어이고, 벡터 묶음 안에서는 벡터 도형의 일부다. */
const boxShapeTypes = new Set(['RECTANGLE', 'ELLIPSE']);

/** 레이어로 내보내지 않고 자식만 펼치는 종류 */
const flattenedTypes = new Set(['GROUP']);

/** 피그마 굵기 스타일 이름과 숫자 굵기 */
const fontWeights: Readonly<Record<string, number>> = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
};

/**
 * 레이어 종류. 피그마 노드 속성으로만 정한다.
 * - text: TEXT 노드
 * - image: 보이는 칠이 모두 이미지인 노드
 * - vector: 벡터 도형, 또는 자기 칠·선·효과가 없고 보이는 자손이 모두 도형(글자·이미지 없음)인 묶음(아이콘 인스턴스 등)
 * - frame: 나머지(루트, 프레임, 자동 배치, 따로 있는 사각형·타원, 아이콘이 아닌 인스턴스)
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

/** 칠·선 하나. 변수에 묶였으면 variable에 변수 이름이 있다. */
export type LayerPaintInput =
  | { type: 'SOLID'; color: FigmaColor; opacity: number; blendMode: string; variable?: string }
  | {
      type: 'IMAGE';
      opacity: number;
      blendMode: string;
      imageHash: string | null;
      scaleMode: string;
    }
  | {
      type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
      opacity: number;
      blendMode: string;
      stops: { position: number; color: FigmaColor; variable?: string }[];
    }
  | { type: 'OTHER'; paintType: string; opacity: number; blendMode: string };

export type LayerEffectInput =
  | {
      type: 'DROP_SHADOW' | 'INNER_SHADOW';
      color: FigmaColor;
      variable?: string;
      offsetX: number;
      offsetY: number;
      radius: number;
      spread: number;
    }
  | { type: 'BLUR'; effectType: string; radius: number; variable?: string }
  | { type: 'OTHER'; effectType: string };

export type TextSegmentInput = {
  fontFamily: string;
  fontStyle: string;
  /** 가변 서체의 wght 축 값 */
  variableWeight?: number;
  fontSize: number;
  lineHeight: { unit: 'PIXELS' | 'PERCENT'; value: number } | { unit: 'AUTO' };
  letterSpacing: { unit: 'PIXELS' | 'PERCENT'; value: number };
  textStyle?: string;
};

/** 피그마 노드를 읽어 옮긴 순수 데이터. 좌표는 페이지 기준 절대 좌표다. */
export type LayerNodeInput = {
  /** 피그마 노드 ID. 벡터 SVG를 찾는 데만 쓰고 출력하지 않는다 */
  id: string;
  name: string;
  type: string;
  visible: boolean;
  box: Box;
  /** 그림자·글자 잉크까지 포함한 실제 렌더링 영역(페이지 기준). 그려지는 것이 없으면 undefined */
  renderBox?: Box;
  opacity?: number;
  layoutMode?: string;
  padding?: Sides;
  itemSpacing?: number;
  primaryAxisAlignItems?: string;
  layoutPositioning?: string;
  clipsContent?: boolean;
  cornerRadius?: number | Corners;
  fills?: readonly LayerPaintInput[];
  fillStyle?: string;
  strokes?: readonly LayerPaintInput[];
  strokeStyle?: string;
  strokeWeight?: number | Sides;
  strokeAlign?: string;
  effects?: readonly LayerEffectInput[];
  effectStyle?: string;
  /** 인스턴스의 원본 컴포넌트 이름(아이콘 이름 등) */
  component?: string;
  text?: {
    characters: string;
    autoResize: string;
    alignHorizontal: string;
    segments: readonly TextSegmentInput[];
  };
  children?: readonly LayerNodeInput[];
};

/** vector 레이어의 SVG 파일 이름(내용의 SHA-256 + `.svg`) */
export type VectorSvgFiles = ReadonlyMap<string, string>;

type Collected = { node: LayerNodeInput; ancestors: string[] };

/**
 * 변형 루트와 그 아래 레이어를 export.json `layers` 목록으로 바꾼다.
 * - 보이지 않는 레이어(visible false)는 자식까지 뺀다.
 * - 그룹은 레이어로 내보내지 않고 자식만 펼친다.
 * - text·vector·image 레이어는 하나로 다루고 자식을 따라가지 않는다. 아이콘이 아닌 인스턴스는 프레임처럼 따라간다.
 * - 위치는 변형 루트 왼쪽 위 기준이다. 루트의 path는 빈 문자열이다.
 * - path는 레이어 이름이다. 같은 이름이 둘 이상이면 내보낸 조상 이름을 앞에 붙여(`content/label`) 구분한다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param root 변형 루트(컴포넌트) 노드
 * @param svgFiles vector 레이어 노드 ID → 내보낸 SVG 파일 이름
 * @returns 문서 순서의 레이어 목록
 */
export function buildLayers(
  root: LayerNodeInput,
  svgFiles: VectorSvgFiles = new Map(),
): JsonObject[] {
  const descendants = collectLayers(root);
  const paths = uniquePaths(descendants.map(({ node, ancestors }) => [...ancestors, node.name]));
  return [
    layerJson(root, '', 'frame', root.box, svgFiles),
    ...descendants.map(({ node }, index) =>
      layerJson(node, paths[index] ?? node.name, layerKind(node), root.box, svgFiles),
    ),
  ];
}

/**
 * 변형 루트 아래에서 SVG로 내보낼 vector 레이어 노드를 찾는다.
 * @param root 변형 루트 노드
 * @returns vector 레이어 노드 ID 목록(문서 순서)
 */
export function vectorLayerIds(root: LayerNodeInput): string[] {
  return collectLayers(root)
    .filter(({ node }) => layerKind(node) === 'vector')
    .map(({ node }) => node.id);
}

/**
 * 레이어 종류를 노드 속성으로 정한다. 변형 루트는 이 함수를 거치지 않고 항상 frame이다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param node 레이어
 * @returns 레이어 종류
 */
export function layerKind(node: LayerNodeInput): LayerKind {
  if (node.type === 'TEXT') {
    return 'text';
  }
  const fills = node.fills ?? [];
  if (fills.length > 0 && fills.every((paint) => paint.type === 'IMAGE')) {
    return 'image';
  }
  if (vectorTypes.has(node.type) || isVectorGroup(node)) {
    return 'vector';
  }
  return 'frame';
}

/**
 * 피그마 굵기 스타일 이름을 숫자 굵기로 바꾼다. 가변 서체는 wght 축 값을 쓴다.
 * @param style 피그마 서체 스타일 이름(예: `SemiBold`, `Bold Italic`)
 * @param variableWeight 가변 서체의 wght 축 값
 * @returns 숫자 굵기, 알 수 없으면 undefined
 */
export function fontWeightOf(style: string, variableWeight?: number): number | undefined {
  if (variableWeight !== undefined) {
    return variableWeight;
  }
  const name = style.replace(/\s*Italic$/u, '').replace(/\s+/gu, '');
  return fontWeights[name === '' ? 'Regular' : name];
}

/**
 * 루트 아래 내보낼 레이어를 문서 순서대로 모은다.
 * @param root 변형 루트 노드
 * @returns 루트를 뺀 레이어와 내보낸 조상 이름
 */
function collectLayers(root: LayerNodeInput): Collected[] {
  const out: Collected[] = [];
  for (const child of root.children ?? []) {
    collect(child, [], out);
  }
  return out;
}

/**
 * 레이어 하나와 그 아래를 모은다.
 * @param node 지금 노드
 * @param ancestors 내보낸 조상 이름(루트 제외)
 * @param out 모은 레이어
 */
function collect(node: LayerNodeInput, ancestors: readonly string[], out: Collected[]): void {
  if (!node.visible) {
    return;
  }
  if (flattenedTypes.has(node.type) && !isVectorGroup(node)) {
    for (const child of node.children ?? []) {
      collect(child, ancestors, out);
    }
    return;
  }
  out.push({ node, ancestors: [...ancestors] });
  if (layerKind(node) !== 'frame') {
    return;
  }
  for (const child of node.children ?? []) {
    collect(child, [...ancestors, node.name], out);
  }
}

/**
 * 벡터 묶음인지 확인한다. 자기 칠·선·효과가 없고, 보이는 자손이 모두 도형(이미지 칠 제외)이며 하나 이상이다.
 * 글자가 하나라도 있으면 벡터 묶음이 아니다. 그때 글자는 text 레이어, 도형은 각각 vector 레이어가 된다.
 * @param node 레이어
 * @returns 벡터 묶음이면 true
 */
function isVectorGroup(node: LayerNodeInput): boolean {
  if (node.children === undefined || hasOwnPaint(node)) {
    return false;
  }
  const shapes = node.children.flatMap(visibleLeaves);
  return (
    shapes.length > 0 &&
    shapes.every(
      (leaf) =>
        (vectorTypes.has(leaf.type) || boxShapeTypes.has(leaf.type)) &&
        !(leaf.fills ?? []).some((paint) => paint.type === 'IMAGE'),
    )
  );
}

/**
 * 보이는 자손 중 자식이 없는 노드(도형, 글자 등)를 모은다. 숨긴 노드는 자손까지 뺀다.
 * @param node 노드
 * @returns 보이는 끝 노드 목록
 */
function visibleLeaves(node: LayerNodeInput): LayerNodeInput[] {
  if (!node.visible) {
    return [];
  }
  if (node.children === undefined || vectorTypes.has(node.type)) {
    return [node];
  }
  return node.children.flatMap(visibleLeaves);
}

/**
 * 노드 자체에 보이는 칠·선·효과가 있는지 확인한다.
 * @param node 레이어
 * @returns 있으면 true
 */
function hasOwnPaint(node: LayerNodeInput): boolean {
  return (
    (node.fills ?? []).length > 0 ||
    ((node.strokes ?? []).length > 0 && hasStrokeWeight(node.strokeWeight)) ||
    (node.effects ?? []).length > 0
  );
}

/**
 * 선 두께가 0보다 큰지 확인한다.
 * @param weight 선 두께
 * @returns 0보다 크면 true
 */
function hasStrokeWeight(weight: number | Sides | undefined): boolean {
  if (weight === undefined) {
    return false;
  }
  return typeof weight === 'number'
    ? weight > 0
    : weight.top + weight.right + weight.bottom + weight.left > 0;
}

/**
 * 레이어마다 겹치지 않는 가장 짧은 경로를 고른다. 이름 앞에 조상 이름을 하나씩 붙여 나간다.
 * 조상까지 모두 같으면 문서 순서대로 `#2`, `#3`을 붙인다.
 * @param fullPaths 레이어마다 [조상..., 이름]
 * @returns 레이어마다 `/`로 이은 경로
 */
function uniquePaths(fullPaths: readonly (readonly string[])[]): string[] {
  const depth = fullPaths.map(() => 1);
  /**
   * 지금 깊이만큼 조상 이름을 붙인 경로를 만든다.
   * @param index 레이어 순서
   * @returns 경로
   */
  function pathOf(index: number): string {
    return (fullPaths[index] ?? []).slice(-(depth[index] ?? 1)).join('/');
  }
  for (let isChanged = true; isChanged;) {
    isChanged = false;
    const groups = new Map<string, number[]>();
    fullPaths.forEach((_, index) => {
      const key = pathOf(index);
      groups.set(key, [...(groups.get(key) ?? []), index]);
    });
    for (const indexes of groups.values()) {
      if (indexes.length < 2) {
        continue;
      }
      for (const index of indexes) {
        if ((depth[index] ?? 1) < (fullPaths[index]?.length ?? 0)) {
          depth[index] = (depth[index] ?? 1) + 1;
          isChanged = true;
        }
      }
    }
  }
  const seen = new Map<string, number>();
  const paths: string[] = [];
  for (let index = 0; index < fullPaths.length; index += 1) {
    const path = pathOf(index);
    const count = (seen.get(path) ?? 0) + 1;
    seen.set(path, count);
    paths.push(count === 1 ? path : `${path}#${count}`);
  }
  return paths;
}

/**
 * 레이어 하나를 JSON으로 바꾼다. 값이 있는 속성만 담는다.
 * @param node 레이어
 * @param path 레이어 경로(루트는 빈 문자열)
 * @param kind 레이어 종류
 * @param rootBox 변형 루트 상자
 * @param svgFiles vector 레이어 노드 ID → SVG 파일 이름
 * @returns 레이어 JSON
 */
function layerJson(
  node: LayerNodeInput,
  path: string,
  kind: LayerKind,
  rootBox: Box,
  svgFiles: VectorSvgFiles,
): JsonObject {
  const layer: JsonObject = {
    path,
    kind,
    type: node.type,
    ...relativeBox(node.box, rootBox),
  };
  if (node.component !== undefined) {
    layer.component = node.component;
  }
  if (node.opacity !== undefined && node.opacity < 1) {
    layer.opacity = round(node.opacity);
  }
  if (node.layoutPositioning === 'ABSOLUTE') {
    layer.absolute = true;
  }
  if (kind === 'vector') {
    return { ...layer, ...vectorJson(node, svgFiles) };
  }
  if (node.layoutMode !== undefined && node.layoutMode !== 'NONE') {
    layer.layoutMode = node.layoutMode;
    if (node.padding !== undefined) {
      layer.padding = sidesJson(node.padding);
    }
    if (node.itemSpacing !== undefined) {
      layer.itemSpacing = round(node.itemSpacing);
    }
    if (node.primaryAxisAlignItems !== undefined) {
      layer.primaryAxisAlignItems = node.primaryAxisAlignItems;
    }
  }
  if (node.clipsContent === true) {
    layer.clipsContent = true;
  }
  if (node.cornerRadius !== undefined && kind !== 'text') {
    layer.cornerRadius =
      typeof node.cornerRadius === 'number'
        ? round(node.cornerRadius)
        : {
            topLeft: round(node.cornerRadius.topLeft),
            topRight: round(node.cornerRadius.topRight),
            bottomRight: round(node.cornerRadius.bottomRight),
            bottomLeft: round(node.cornerRadius.bottomLeft),
          };
  }
  const fills = (node.fills ?? []).map(paintJson);
  if (fills.length > 0) {
    layer.fills = fills;
    if (node.fillStyle !== undefined) {
      layer.fillStyle = node.fillStyle;
    }
  }
  const strokes = (node.strokes ?? []).map(paintJson);
  if (strokes.length > 0 && node.strokeWeight !== undefined && hasStrokeWeight(node.strokeWeight)) {
    layer.strokes = strokes;
    layer.strokeWeight =
      typeof node.strokeWeight === 'number'
        ? round(node.strokeWeight)
        : sidesJson(node.strokeWeight);
    if (node.strokeAlign !== undefined) {
      layer.strokeAlign = node.strokeAlign;
    }
    if (node.strokeStyle !== undefined) {
      layer.strokeStyle = node.strokeStyle;
    }
  }
  const effects = (node.effects ?? []).map(effectJson);
  if (effects.length > 0) {
    layer.effects = effects;
    if (node.effectStyle !== undefined) {
      layer.effectStyle = node.effectStyle;
    }
  }
  if (node.text !== undefined) {
    layer.text = textJson(node, rootBox);
  }
  return layer;
}

/**
 * vector 레이어는 상자, SVG 파일과 그 영역(레이어 상자 기준), 색만 담는다.
 * 색은 자기 칠이 있으면 그것, 없으면 안의 보이는 도형이 모두 같은 칠을 쓸 때 그 칠이다(아이콘 색).
 * @param node vector 레이어
 * @param svgFiles 노드 ID → SVG 파일 이름
 * @returns 덧붙일 속성
 */
function vectorJson(node: LayerNodeInput, svgFiles: VectorSvgFiles): JsonObject {
  const result: JsonObject = {};
  const file = svgFiles.get(node.id);
  if (file !== undefined) {
    const render = node.renderBox ?? node.box;
    result.svg = { file, ...relativeBox(render, node.box) };
  }
  const own = (node.fills ?? []).map(paintJson);
  if (own.length > 0) {
    result.fills = own;
    return result;
  }
  const shapes = shapeLeaves(node).map((leaf) => (leaf.fills ?? []).map(paintJson));
  const painted = shapes.filter((paints) => paints.length > 0);
  const [first] = painted;
  if (first !== undefined && painted.every((paints) => sameJson(paints, first))) {
    result.fills = first;
  }
  return result;
}

/**
 * 묶음 안의 보이는 도형을 모은다.
 * @param node 묶음
 * @returns 보이는 도형 목록
 */
function shapeLeaves(node: LayerNodeInput): LayerNodeInput[] {
  if (!node.visible) {
    return [];
  }
  if (node.children === undefined) {
    return [node];
  }
  return node.children.flatMap(shapeLeaves);
}

/**
 * 칠 하나를 JSON으로 바꾼다. 색은 칠 불투명도를 곱한 `#rrggbb[aa]`이고, 묶인 변수는 DTCG 별칭이다.
 * @param paint 칠
 * @returns 칠 JSON
 */
function paintJson(paint: LayerPaintInput): JsonObject {
  const blend: JsonObject =
    paint.blendMode === 'NORMAL' || paint.blendMode === 'PASS_THROUGH'
      ? {}
      : { blendMode: paint.blendMode };
  switch (paint.type) {
    case 'SOLID':
      return withToken(
        { type: 'SOLID', color: colorToHex(withAlpha(paint.color, paint.opacity)), ...blend },
        paint.variable,
      );
    case 'IMAGE':
      return {
        type: 'IMAGE',
        imageHash: paint.imageHash,
        scaleMode: paint.scaleMode,
        opacity: round(paint.opacity),
        ...blend,
      };
    case 'OTHER':
      return { type: paint.paintType, opacity: round(paint.opacity), ...blend };
    default:
      return {
        type: paint.type,
        stops: paint.stops.map((stop) => gradientStopJson(stop, paint.opacity)),
        ...blend,
      };
  }
}

/**
 * 그라디언트 색 지점 하나를 JSON으로 바꾼다. 색 알파에 칠 불투명도를 곱한다.
 * @param stop 색 지점
 * @param stop.position 위치(0~1)
 * @param stop.color 색
 * @param stop.variable 묶인 변수 이름
 * @param opacity 칠 불투명도
 * @returns 색 지점 JSON
 */
function gradientStopJson(
  stop: { position: number; color: FigmaColor; variable?: string },
  opacity: number,
): JsonObject {
  return withToken(
    { position: round(stop.position), color: colorToHex(withAlpha(stop.color, opacity)) },
    stop.variable,
  );
}

/**
 * 효과 하나를 JSON으로 바꾼다.
 * @param effect 효과
 * @returns 효과 JSON
 */
function effectJson(effect: LayerEffectInput): JsonObject {
  switch (effect.type) {
    case 'DROP_SHADOW':
    case 'INNER_SHADOW':
      return withToken(
        {
          type: effect.type,
          color: colorToHex(effect.color),
          offsetX: round(effect.offsetX),
          offsetY: round(effect.offsetY),
          radius: round(effect.radius),
          spread: round(effect.spread),
        },
        effect.variable,
      );
    case 'BLUR':
      return withToken({ type: effect.effectType, radius: round(effect.radius) }, effect.variable);
    case 'OTHER':
      return { type: effect.effectType };
  }
}

/**
 * 글자 정보를 JSON으로 바꾼다. 구간마다 같은 값은 하나로, 다른 값은 구간 순서의 목록으로 둔다.
 * 서체 이름과 글자 스타일 이름은 항상 겹치지 않는 목록이다(한글·라틴 서체를 나눠 쓰기 때문이다).
 * 효과가 없으면 렌더링 영역이 곧 글리프 잉크 영역이라 ink로 함께 담는다.
 * @param node 글자 레이어
 * @param rootBox 변형 루트 상자
 * @returns 글자 JSON
 */
function textJson(node: LayerNodeInput, rootBox: Box): JsonObject {
  const text = node.text;
  if (text === undefined) {
    return {};
  }
  const { segments } = text;
  const json: JsonObject = {
    characters: text.characters,
    autoResize: text.autoResize,
    alignHorizontal: text.alignHorizontal,
    fontFamily: distinct(segments.map((segment) => segment.fontFamily)),
    fontWeight: single(
      segments.map((segment) => fontWeightOf(segment.fontStyle, segment.variableWeight) ?? 0),
    ),
    fontSize: single(segments.map((segment) => round(segment.fontSize))),
    lineHeight: single(segments.map(lineHeightValue)),
    letterSpacing: single(segments.map(letterSpacingValue)),
    textStyle: distinct(segments.flatMap((segment) => segment.textStyle ?? [])),
  };
  if ((node.effects ?? []).length === 0 && node.renderBox !== undefined) {
    json.ink = relativeBox(node.renderBox, rootBox);
  }
  return json;
}

/**
 * 줄 높이를 px로 바꾼다. 자동이면 `AUTO`다.
 * @param segment 서식 구간
 * @returns px 또는 `AUTO`
 */
function lineHeightValue(segment: TextSegmentInput): number | string {
  const { lineHeight } = segment;
  if (lineHeight.unit === 'AUTO') {
    return 'AUTO';
  }
  return lineHeight.unit === 'PIXELS'
    ? round(lineHeight.value)
    : round((segment.fontSize * lineHeight.value) / 100);
}

/**
 * 자간을 px로 바꾼다.
 * @param segment 서식 구간
 * @returns px
 */
function letterSpacingValue(segment: TextSegmentInput): number {
  const { letterSpacing } = segment;
  return letterSpacing.unit === 'PIXELS'
    ? round(letterSpacing.value)
    : round((segment.fontSize * letterSpacing.value) / 100);
}

/**
 * 모두 같으면 그 값 하나, 아니면 겹치지 않는 목록이다.
 * @param values 구간 값
 * @returns 값 하나 또는 목록
 */
function single(values: readonly (number | string)[]): JsonValue {
  const unique = distinct(values);
  return unique.length === 1 ? (unique[0] ?? null) : unique;
}

/**
 * 순서를 지키며 겹치는 값을 뺀다.
 * @param values 값 목록
 * @returns 겹치지 않는 값 목록
 */
function distinct<T extends string | number>(values: readonly T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

/**
 * 두 JSON 값이 같은지 확인한다.
 * @param left 왼쪽 값
 * @param right 오른쪽 값
 * @returns 같으면 true
 */
function sameJson(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 묶인 변수가 있으면 DTCG 별칭(`{accent-fill.default}`)을 token으로 붙인다.
 * @param json 칠·효과 JSON
 * @param variable 변수 이름
 * @returns token을 붙인 JSON
 */
function withToken(json: JsonObject, variable: string | undefined): JsonObject {
  return variable === undefined ? json : { ...json, token: aliasReference(variable) };
}

/**
 * 색 알파에 칠 불투명도를 곱한다.
 * @param color 색
 * @param opacity 칠 불투명도
 * @returns 알파를 곱한 색
 */
function withAlpha(color: FigmaColor, opacity: number): FigmaColor {
  return { r: color.r, g: color.g, b: color.b, a: (color.a ?? 1) * opacity };
}

/**
 * 상자를 기준 상자 왼쪽 위 기준으로 바꾼다.
 * @param box 상자
 * @param origin 기준 상자
 * @returns `{ x, y, width, height }`
 */
function relativeBox(box: Box, origin: Box): JsonObject {
  return {
    x: round(box.x - origin.x),
    y: round(box.y - origin.y),
    width: round(box.width),
    height: round(box.height),
  };
}

/**
 * 네 변 값을 JSON으로 바꾼다.
 * @param sides 네 변 값
 * @returns `{ top, right, bottom, left }`
 */
function sidesJson(sides: Sides): JsonObject {
  return {
    top: round(sides.top),
    right: round(sides.right),
    bottom: round(sides.bottom),
    left: round(sides.left),
  };
}

/**
 * 피그마 float32 잡음을 소수 넷째 자리에서 정리한다.
 * @param value 숫자
 * @returns 정리한 숫자
 */
function round(value: number): number {
  return Math.round(value * NUMBER_PRECISION) / NUMBER_PRECISION;
}
