import { assetName } from '../naming';
import type { JsonObject, JsonValue } from '../stable-json';
import { sizingOf } from './check-structure';
import { type CodeVariables, cssAngle, pairedVariable } from './code-variables';
import type { Bound, NodeData, PaintData, ReactionData } from './node-data';

// 변형마다 export.json에 담는 구현 참고용 레이어 트리를 만든다. 판정에는 쓰지 않는다([[피그마 연동:피그마 플러그인]]).
// 기본값은 적지 않아 사람이 읽을 수 있는 크기로 둔다.

/**
 * 노드 데이터를 레이어 트리로 옮긴다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param node 노드 데이터
 * @param codeVariables 회전·최대 줄 수·비율과 짝짓는 코드 전용 변수
 * @param isRoot 변형 루트인지
 * @returns 레이어 트리
 */
export function layerTree(node: NodeData, codeVariables: CodeVariables, isRoot = true): JsonObject {
  const sizing = sizingOf(node, isRoot);
  const tree: JsonObject = {
    name: node.name,
    type: node.type,
    size: { w: roundPx(node.width.value), h: roundPx(node.height.value) },
    sizing: { h: sizing.horizontal, v: sizing.vertical },
  };
  putBound(tree, 'width', node.width);
  putBound(tree, 'height', node.height);
  putOptionalBounds(tree, node);
  putAppearance(tree, node, codeVariables);
  putLayout(tree, node);
  putText(tree, node, codeVariables);
  if (node.instance !== null) {
    tree.component = node.instance.component;
    if (Math.abs(node.instance.scaleFactor - 1) > 1e-6) {
      tree.scaleFactor = node.instance.scaleFactor;
    }
    if (Object.keys(node.instance.properties).length > 0) {
      tree.properties = { ...node.instance.properties };
    }
  }
  if (node.asset !== null) {
    tree.asset = {
      path: assetName(node.asset),
      ...(node.asset.color === undefined ? {} : { color: node.asset.color }),
    };
  }
  if (node.annotations.length > 0) {
    tree.annotations = [...node.annotations];
  }
  if (node.reactions.length > 0) {
    tree.reactions = node.reactions.map(reactionJson);
  }
  if (node.children.length > 0) {
    tree.children = node.children.map((child) => layerTree(child, codeVariables, false));
  }
  return tree;
}

/**
 * 변형에 빈 HUG 슬롯이 있는지 본다. 슬롯이 비어 있고 내용에 맞추는 축이 있으면 피그마가 그리는 크기는 디자인 값이 아니다.
 * 이런 변형은 단독 캡처에서 빠진다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param root 변형 루트
 * @returns 있으면 true
 */
export function hasEmptyHugSlot(root: NodeData): boolean {
  return root.children.some(
    /**
     * 자식이나 그 아래에 빈 HUG 슬롯이 있는지 본다.
     * @param child 자식
     * @returns 있으면 true
     */
    (child) => {
      if (child.type === 'SLOT' && child.children.length === 0) {
        const { horizontal, vertical } = sizingOf(child, false);
        return horizontal === 'HUG' || vertical === 'HUG' || hasEmptyHugSlot(child);
      }
      return hasEmptyHugSlot(child);
    },
  );
}

/**
 * 값 하나를 적는다. 변수에 연결했으면 변수 이름, 아니면 숫자다.
 * @param bound 값과 변수
 * @returns 변수 이름이나 숫자
 */
function boundJson(bound: Bound): JsonValue {
  return bound.variable ?? roundPx(bound.value);
}

/**
 * 변수에 연결된 값만 적는다. 숫자는 `size`에 이미 있다.
 * @param tree 트리
 * @param key 키
 * @param bound 값과 변수
 */
function putBound(tree: JsonObject, key: string, bound: Bound): void {
  if (bound.variable !== undefined) {
    tree[key] = bound.variable;
  }
}

/**
 * 최소·최대 크기를 적는다.
 * @param tree 트리
 * @param node 노드
 */
function putOptionalBounds(tree: JsonObject, node: NodeData): void {
  for (const [key, bound] of [
    ['minWidth', node.minWidth],
    ['maxWidth', node.maxWidth],
    ['minHeight', node.minHeight],
    ['maxHeight', node.maxHeight],
  ] as const) {
    if (bound !== null) {
      tree[key] = boundJson(bound);
    }
  }
}

/**
 * 칠·선·반경·효과·회전·비율·불투명도를 적는다.
 * @param tree 트리
 * @param node 노드
 * @param codeVariables 코드 전용 변수
 */
function putAppearance(tree: JsonObject, node: NodeData, codeVariables: CodeVariables): void {
  if (Math.abs(node.opacity.value - 1) > 1e-6) {
    tree.opacity = boundJson(node.opacity);
  }
  if (node.rotation !== 0) {
    tree.rotation = {
      value: node.rotation,
      variable: pairedVariable(cssAngle(node.rotation), codeVariables.rotate) ?? null,
    };
  }
  if (node.aspectRatio !== null) {
    tree.aspectRatio = {
      value: roundPx(node.aspectRatio),
      variable: pairedVariable(node.aspectRatio, codeVariables.ratio) ?? null,
    };
  }
  if (node.fillStyle !== undefined) {
    tree.fillStyle = node.fillStyle;
  } else if (Array.isArray(node.fills) && node.fills.length > 0) {
    tree.fills = node.fills.filter((paint) => paint.visible).map(paintJson);
  }
  if (node.strokes !== null && node.strokes.some((paint) => paint.visible)) {
    if (node.strokeStyle === undefined) {
      tree.strokes = node.strokes.filter((paint) => paint.visible).map(paintJson);
    } else {
      tree.strokeStyle = node.strokeStyle;
    }
    if (node.strokeWeight !== undefined) {
      const { top, right, bottom, left } = node.strokeWeight;
      tree.strokeWeight = [top, right, bottom, left].map(boundJson);
    }
    tree.strokesIncludedInLayout = node.strokesIncludedInLayout;
  }
  if (node.radius !== undefined) {
    const { topLeft, topRight, bottomRight, bottomLeft } = node.radius;
    const corners = [topLeft, topRight, bottomRight, bottomLeft];
    if (corners.some((corner) => corner.value !== 0 || corner.variable !== undefined)) {
      tree.radius = corners.map(boundJson);
    }
  }
  if (node.effectStyle !== undefined) {
    tree.effectStyle = node.effectStyle;
  }
  if (node.child?.positioning === 'ABSOLUTE') {
    tree.absolute = { ...node.child.constraints };
  }
}

/**
 * 칠 하나를 적는다.
 * @param paint 칠
 * @returns 변수 이름이나 칠 종류
 */
function paintJson(paint: PaintData): JsonValue {
  return paint.variable ?? paint.type;
}

/**
 * 자동 배치를 적는다.
 * @param tree 트리
 * @param node 노드
 */
function putLayout(tree: JsonObject, node: NodeData): void {
  const { layout } = node;
  if (layout === null || layout.mode === 'NONE') {
    return;
  }
  const { top, right, bottom, left } = layout.padding;
  tree.layout = {
    mode: layout.mode,
    primaryAlign: layout.primaryAlign,
    counterAlign: layout.counterAlign,
    gap: boundJson(layout.itemSpacing),
    padding: [top, right, bottom, left].map(boundJson),
    ...(layout.wrap === 'WRAP' ? { wrap: true } : {}),
  };
}

/**
 * 글자를 적는다.
 * @param tree 트리
 * @param node 노드
 * @param codeVariables 코드 전용 변수
 */
function putText(tree: JsonObject, node: NodeData, codeVariables: CodeVariables): void {
  const { text } = node;
  if (text === null) {
    return;
  }
  tree.text = {
    autoResize: text.autoResize,
    truncation: text.truncation,
    maxLines: text.maxLines,
    maxLinesVariable:
      text.maxLines === null
        ? null
        : (pairedVariable(text.maxLines, codeVariables.lineClamp) ?? null),
    segments: text.segments.map(
      /**
       * 글자 구간 하나를 적는다.
       * @param segment 구간
       * @returns JSON 객체
       */
      (segment) => ({
        characters: segment.characters,
        textStyle: segment.textStyle ?? null,
        fill:
          segment.fillStyle ??
          segment.fills.map((paint) => paint.variable ?? paint.type).join(', '),
      }),
    ),
  };
}

/**
 * 변형 전환 하나를 적는다.
 * @param reaction 전환
 * @returns JSON 객체
 */
function reactionJson(reaction: ReactionData): JsonObject {
  return {
    trigger: reaction.trigger,
    destination: reaction.destination,
    navigation: reaction.navigation,
    transition:
      reaction.transition === null
        ? null
        : {
            type: reaction.transition.type,
            durationMs: reaction.transition.durationMs,
            easing: reaction.transition.easing.type,
            bezier: reaction.transition.easing.bezier,
          },
  };
}

/**
 * 좌표를 0.01px로 반올림한다.
 * @param value 좌표
 * @returns 반올림한 좌표
 */
function roundPx(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}
