import type {
  Box,
  LayerEffectInput,
  LayerNodeInput,
  LayerPaintInput,
  TextSegmentInput,
} from './layer-export';

// 피그마 노드를 layer-export.ts의 순수 입력으로 읽는다. 변수·스타일은 이름으로 바꿔 둔다.

/** 변수·스타일 ID → 이름 캐시 */
export type NameCache = Map<string, string | undefined>;

/**
 * 노드와 그 아래 노드를 레이어 변환 입력으로 읽는다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param node 변형 루트 노드
 * @param names 변수·스타일 이름 캐시
 * @returns 레이어 변환 입력
 */
export async function readLayerTree(
  node: SceneNode,
  names: NameCache = new Map(),
): Promise<LayerNodeInput> {
  const input: LayerNodeInput = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    box: boxOf(node.absoluteBoundingBox, node),
  };
  if ('absoluteRenderBounds' in node && node.absoluteRenderBounds !== null) {
    input.renderBox = boxOf(node.absoluteRenderBounds, node);
  }
  if ('opacity' in node) {
    input.opacity = node.opacity;
  }
  if ('layoutMode' in node) {
    input.layoutMode = node.layoutMode;
    input.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft,
    };
    input.itemSpacing = node.itemSpacing;
    input.primaryAxisAlignItems = node.primaryAxisAlignItems;
  }
  if ('layoutPositioning' in node) {
    input.layoutPositioning = node.layoutPositioning;
  }
  if ('clipsContent' in node) {
    input.clipsContent = node.clipsContent;
  }
  if ('cornerRadius' in node) {
    if (node.cornerRadius !== figma.mixed) {
      input.cornerRadius = node.cornerRadius;
    } else if ('topLeftRadius' in node) {
      input.cornerRadius = {
        topLeft: node.topLeftRadius,
        topRight: node.topRightRadius,
        bottomRight: node.bottomRightRadius,
        bottomLeft: node.bottomLeftRadius,
      };
    }
  }
  if ('fills' in node && node.fills !== figma.mixed) {
    input.fills = await layerPaints(node.fills, names);
    input.fillStyle = await styleName(node.fillStyleId, names);
  }
  if ('strokes' in node) {
    input.strokes = await layerPaints(node.strokes, names);
    input.strokeStyle = await styleName(node.strokeStyleId, names);
    input.strokeAlign = node.strokeAlign;
    if (node.strokeWeight !== figma.mixed) {
      input.strokeWeight = node.strokeWeight;
    } else if ('strokeTopWeight' in node) {
      input.strokeWeight = {
        top: node.strokeTopWeight,
        right: node.strokeRightWeight,
        bottom: node.strokeBottomWeight,
        left: node.strokeLeftWeight,
      };
    }
  }
  if ('effects' in node) {
    const effects: LayerEffectInput[] = [];
    for (const effect of node.effects) {
      if (effect.visible) {
        effects.push(await layerEffect(effect, names));
      }
    }
    input.effects = effects;
    input.effectStyle = await styleName(node.effectStyleId, names);
  }
  if (node.type === 'TEXT') {
    input.text = await textInput(node, names);
  }
  if (node.type === 'INSTANCE') {
    input.component = (await node.getMainComponentAsync())?.name;
  }
  if ('children' in node) {
    const children: LayerNodeInput[] = [];
    for (const child of node.children) {
      children.push(await readLayerTree(child, names));
    }
    input.children = children;
  }
  return input;
}

/**
 * vector 레이어를 SVG로 내보낸다. 글자는 윤곽선으로 바꾸고 id 속성은 넣지 않아 내용이 매번 같게 한다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param nodeId vector 레이어 노드 ID
 * @returns SVG 파일 내용
 */
export async function exportVectorSvg(nodeId: string): Promise<Uint8Array> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || !('exportAsync' in node)) {
    throw new Error(`vector 레이어 ${nodeId}를 찾을 수 없다.`);
  }
  return node.exportAsync({ format: 'SVG', svgOutlineText: true, svgIdAttribute: false });
}

/**
 * 피그마 상자를 순수 상자로 옮긴다. 없으면 노드 크기를 쓴다.
 * @param rect 피그마 상자
 * @param node 노드
 * @returns 상자
 */
function boxOf(rect: Rect | null, node: SceneNode): Box {
  if (rect === null) {
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/**
 * 보이는 칠을 레이어 변환 입력으로 옮긴다.
 * @param paints 피그마 칠
 * @param names 변수 이름 캐시
 * @returns 보이는 칠 목록
 */
async function layerPaints(paints: readonly Paint[], names: NameCache): Promise<LayerPaintInput[]> {
  const result: LayerPaintInput[] = [];
  for (const paint of paints) {
    if (paint.visible === false) {
      continue;
    }
    const opacity = paint.opacity ?? 1;
    const blendMode = paint.blendMode ?? 'NORMAL';
    if (paint.type === 'SOLID') {
      result.push({
        type: 'SOLID',
        color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
        opacity,
        blendMode,
        variable: await variableName(paint.boundVariables?.color, names),
      });
    } else if (paint.type === 'IMAGE') {
      result.push({
        type: 'IMAGE',
        opacity,
        blendMode,
        imageHash: paint.imageHash,
        scaleMode: paint.scaleMode,
      });
    } else if (
      paint.type === 'GRADIENT_LINEAR' ||
      paint.type === 'GRADIENT_RADIAL' ||
      paint.type === 'GRADIENT_ANGULAR' ||
      paint.type === 'GRADIENT_DIAMOND'
    ) {
      const stops = [];
      for (const stop of paint.gradientStops) {
        stops.push({
          position: stop.position,
          color: { ...stop.color },
          variable: await variableName(stop.boundVariables?.color, names),
        });
      }
      result.push({ type: paint.type, opacity, blendMode, stops });
    } else {
      result.push({ type: 'OTHER', paintType: paint.type, opacity, blendMode });
    }
  }
  return result;
}

/**
 * 효과 하나를 레이어 변환 입력으로 옮긴다.
 * @param effect 피그마 효과
 * @param names 변수 이름 캐시
 * @returns 효과 입력
 */
async function layerEffect(effect: Effect, names: NameCache): Promise<LayerEffectInput> {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    return {
      type: effect.type,
      color: { ...effect.color },
      variable: await variableName(effect.boundVariables?.color, names),
      offsetX: effect.offset.x,
      offsetY: effect.offset.y,
      radius: effect.radius,
      spread: effect.spread ?? 0,
    };
  }
  if ((effect.type === 'BACKGROUND_BLUR' || effect.type === 'LAYER_BLUR') && 'radius' in effect) {
    return {
      type: 'BLUR',
      effectType: effect.type,
      radius: effect.radius,
      variable: await variableName(effect.boundVariables?.radius, names),
    };
  }
  return { type: 'OTHER', effectType: effect.type };
}

/**
 * 글자와 서식 구간을 읽는다.
 * @param node 글자 노드
 * @param names 스타일 이름 캐시
 * @returns 글자 입력
 */
async function textInput(node: TextNode, names: NameCache): Promise<LayerNodeInput['text']> {
  const segments: TextSegmentInput[] = [];
  for (const segment of node.getStyledTextSegments([
    'fontName',
    'fontSize',
    'lineHeight',
    'letterSpacing',
    'textStyleId',
  ])) {
    segments.push({
      fontFamily: segment.fontName.family,
      fontStyle: segment.fontName.style,
      variableWeight: segment.fontName.variationSettings?.wght,
      fontSize: segment.fontSize,
      lineHeight: segment.lineHeight,
      letterSpacing: segment.letterSpacing,
      textStyle: await styleName(segment.textStyleId, names),
    });
  }
  return {
    characters: node.characters,
    autoResize: node.textAutoResize,
    alignHorizontal: node.textAlignHorizontal,
    segments,
  };
}

/**
 * 변수 별칭의 변수 이름을 찾는다.
 * @param alias 변수 별칭
 * @param names 이름 캐시
 * @returns 변수 이름, 없으면 undefined
 */
async function variableName(
  alias: { id: string } | undefined,
  names: NameCache,
): Promise<string | undefined> {
  if (alias === undefined) {
    return undefined;
  }
  if (!names.has(alias.id)) {
    names.set(alias.id, (await figma.variables.getVariableByIdAsync(alias.id))?.name);
  }
  return names.get(alias.id);
}

/**
 * 스타일 ID의 스타일 이름을 찾는다.
 * @param id 스타일 ID(없거나 섞여 있으면 빈 문자열이나 mixed)
 * @param names 이름 캐시
 * @returns 스타일 이름, 없으면 undefined
 */
async function styleName(id: string | symbol, names: NameCache): Promise<string | undefined> {
  if (typeof id !== 'string' || id === '') {
    return undefined;
  }
  if (!names.has(id)) {
    names.set(id, (await figma.getStyleByIdAsync(id))?.name);
  }
  return names.get(id);
}
