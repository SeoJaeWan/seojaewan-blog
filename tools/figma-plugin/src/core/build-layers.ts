import { assetFile } from '../naming';
import type { JsonObject, JsonValue } from '../stable-json';
import { absoluteDistances, type CheckContext, insetToken, sizingOf } from './check-structure';
import type { Bound, NodeData, Sides, TextSegmentData } from './node-data';

// 구조 검사를 통과한 변형을 export.json의 레이어 목록으로 바꾸는 순수 변환이다.
// 레이어마다 역할별 변수·스타일 이름과 자동 배치 선택지만 남긴다. 위치 좌표나 측정값은 남기지 않는다.
// 이름을 코드 클래스로 바꾸는 규칙은 비교 도구(packages/design-system/scripts/parity/rules)가 가진다.

/**
 * 변형 루트와 그 아래 보이는 레이어를 문서 순서의 목록으로 만든다. 첫 항목이 루트다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param root 변형 루트 노드 데이터(구조 검사를 통과한 것)
 * @param context 파일 수준 정보(절대 위치 거리 토큰)
 * @returns 레이어 목록
 */
export function buildLayers(root: NodeData, context: CheckContext): JsonObject[] {
  const layers: JsonObject[] = [];
  /**
   * 노드와 그 아래를 목록에 더한다.
   * @param node 노드
   * @param isRoot 변형 루트인지
   */
  function visit(node: NodeData, isRoot: boolean): void {
    layers.push(layerOf(node, isRoot, context));
    if (node.asset !== null) {
      return;
    }
    for (const child of node.children) {
      visit(child, false);
    }
  }
  visit(root, true);
  return layers;
}

/**
 * 변형 안에서 숨긴 레이어의 경로를 모은다(D4). 비교 도구는 이 경로의 요소가 보이면 실패시킨다.
 * @param root 변형 루트 노드 데이터
 * @returns 숨긴 레이어 경로 목록
 */
export function hiddenLayerPaths(root: NodeData): string[] {
  const paths: string[] = [];
  /**
   * 노드 아래 숨긴 레이어를 모은다.
   * @param node 노드
   */
  function visit(node: NodeData): void {
    paths.push(...node.hiddenChildren.map((hidden) => hidden.path));
    for (const child of node.children) {
      visit(child);
    }
  }
  visit(root);
  return paths.sort();
}

/**
 * 노드 하나를 레이어 항목으로 만든다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param context 파일 수준 정보
 * @returns 레이어 항목
 */
function layerOf(node: NodeData, isRoot: boolean, context: CheckContext): JsonObject {
  const layer: JsonObject = {
    path: node.path,
    type: node.type,
    parentLayout: node.parentLayoutMode,
  };
  const sizing = sizingOf(node, isRoot);
  layer.sizing = sizingJson(node, sizing);
  if (node.asset !== null) {
    layer.asset = {
      name: node.asset.name,
      group: node.asset.group,
      kind: node.asset.kind,
      file: assetFile(node.asset),
      color: node.asset.colorVariable ?? null,
    };
    addSelf(layer, node, context);
    return layer;
  }
  if (node.opacity.variable !== undefined) {
    layer.opacity = node.opacity.variable;
  }
  if (node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') {
    layer.blendMode = node.blendMode;
  }
  if (Math.round(node.rotation) !== 0) {
    layer.rotation = Math.round(node.rotation);
  }
  if (node.clipsContent === true) {
    layer.clipsContent = true;
  }
  const fill = paintName(node.fills === 'mixed' ? null : node.fills, node.fillStyle);
  if (fill !== null && node.text === null) {
    layer.fill = fill;
  }
  const stroke = paintName(node.strokes, node.strokeStyle);
  if (stroke !== null && node.strokeWeight !== undefined) {
    layer.stroke = {
      paint: stroke,
      align: node.strokeAlign ?? 'INSIDE',
      includedInLayout: node.layout?.strokesIncludedInLayout ?? false,
      weight: sidesJson(node.strokeWeight),
    };
  }
  if (node.radius !== undefined) {
    const radius: JsonObject = {};
    for (const [corner, value] of Object.entries(node.radius)) {
      if (value.variable !== undefined && value.value > 0) {
        radius[corner] = value.variable;
      }
    }
    if (Object.keys(radius).length > 0) {
      layer.radius = radius;
    }
  }
  if (node.effectStyle !== undefined && (node.effects ?? []).some((effect) => effect.visible)) {
    layer.effect = node.effectStyle;
  }
  if (node.layout !== null && node.layout.mode !== 'NONE') {
    const { layout } = node;
    layer.layout = {
      mode: layout.mode,
      wrap: layout.wrap,
      primaryAlign: layout.primaryAlign,
      counterAlign: layout.counterAlign,
      ...(layout.wrap === 'WRAP' ? { alignContent: layout.alignContent } : {}),
      padding: sidesJson(layout.padding),
      gap:
        node.children.filter((child) => child.child?.positioning !== 'ABSOLUTE').length > 1 &&
        layout.primaryAlign !== 'SPACE_BETWEEN'
          ? (layout.itemSpacing.variable ?? null)
          : null,
      counterGap:
        layout.wrap === 'WRAP' && layout.counterAxisSpacing !== null
          ? (layout.counterAxisSpacing.variable ?? null)
          : null,
    };
  }
  addSelf(layer, node, context);
  if (node.text !== null) {
    const { text } = node;
    layer.text = {
      characters: text.characters,
      alignHorizontal: text.alignHorizontal,
      alignVertical: text.alignVertical,
      autoResize: text.autoResize,
      maxLines: text.truncation === 'ENDING' ? text.maxLines : null,
      segments: text.segments.map(segmentJson),
    };
  }
  return layer;
}

/**
 * 자동 배치 부모 안에서의 자기 배치(정렬, 늘이기, 절대 위치)를 더한다.
 * @param layer 레이어 항목
 * @param node 노드
 * @param context 파일 수준 정보
 */
function addSelf(layer: JsonObject, node: NodeData, context: CheckContext): void {
  const { child } = node;
  if (child === null || node.parentLayoutMode === null) {
    return;
  }
  const self: JsonObject = {};
  if (child.layoutAlign !== 'INHERIT') {
    self.align = child.layoutAlign;
  }
  if (child.positioning === 'ABSOLUTE') {
    const absolute: JsonObject = {};
    for (const axis of ['horizontal', 'vertical'] as const) {
      absolute[axis] = {
        constraint: child.constraints[axis],
        distances: absoluteDistances(node, axis).map((distance) => ({
          token: insetToken(distance, context) ?? null,
          isNegative: distance < 0,
        })),
      };
    }
    self.absolute = absolute;
  }
  if (Object.keys(self).length > 0) {
    layer.self = self;
  }
}

/**
 * 크기 방식과 고정 크기의 변수 이름을 만든다.
 * @param node 노드
 * @param sizing 가로·세로 크기 방식
 * @param sizing.horizontal 가로 크기 방식
 * @param sizing.vertical 세로 크기 방식
 * @returns 크기 항목
 */
function sizingJson(node: NodeData, sizing: { horizontal: string; vertical: string }): JsonObject {
  const json: JsonObject = { horizontal: sizing.horizontal, vertical: sizing.vertical };
  if (sizing.horizontal === 'FIXED') {
    json.width = node.width.variable ?? null;
  }
  if (sizing.vertical === 'FIXED') {
    json.height = node.height.variable ?? null;
  }
  for (const [key, bound] of [
    ['minWidth', node.minWidth],
    ['maxWidth', node.maxWidth],
    ['minHeight', node.minHeight],
    ['maxHeight', node.maxHeight],
  ] as const) {
    if (bound !== null) {
      json[key] = bound.variable ?? null;
    }
  }
  return json;
}

/**
 * 칠·선을 변수 이름이나 스타일 이름으로 바꾼다.
 * @param paints 칠 목록
 * @param style 스타일 이름
 * @returns `{ style }`이나 `{ variable }`, 보이는 칠이 없으면 null
 */
function paintName(
  paints: readonly { visible: boolean; variable?: string }[] | null,
  style: string | undefined,
): JsonObject | null {
  const visible = (paints ?? []).filter((paint) => paint.visible);
  if (visible.length === 0) {
    return null;
  }
  if (style !== undefined) {
    return { style };
  }
  return { variable: visible[0]?.variable ?? null };
}

/**
 * 네 변 값을 변수 이름으로 바꾼다. 0이고 변수가 없는 변은 null이다.
 * @param sides 네 변 값
 * @returns 변마다 변수 이름
 */
function sidesJson(sides: Sides<Bound>): JsonObject {
  const json: JsonObject = {};
  for (const [side, value] of Object.entries(sides)) {
    json[side] = value.variable ?? null;
  }
  return json;
}

/**
 * 글자 구간을 레이어 항목으로 만든다. 서체 이름과 글자 스타일이 묶은 변수 이름(D2)을 남긴다.
 * @param segment 구간
 * @returns 구간 항목
 */
function segmentJson(segment: TextSegmentData): JsonObject {
  const fields: JsonObject = {};
  for (const [field, bound] of Object.entries(segment.styleFields ?? {})) {
    const value: JsonValue =
      bound.variable === undefined ? { value: bound.value } : { variable: bound.variable };
    fields[field] = value;
  }
  return {
    start: segment.start,
    end: segment.end,
    fontFamily: segment.fontFamily,
    textStyle: segment.textStyle ?? null,
    style: fields,
    fill: paintName(segment.fills, segment.fillStyle),
    textDecoration: segment.textDecoration,
  };
}
