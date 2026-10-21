import type {
  DesignTokensInput,
  EffectInput,
  GradientStopInput,
  PaintInput,
  TextStyleInput,
  VariableAlias,
  VariableInput,
  VariableValueInput,
} from './design-tokens';
import type { RenderBounds } from './export-manifest';
import { buildLayers, vectorLayerIds } from './layer-export';
import { exportVectorSvg, readLayerTree } from './layer-reader';
import type { ComponentSummary } from './messages';
import { COMPONENTS_PAGE_ID, SCALE } from './plugin-config';
import { sha256Hex } from './sha256';
import type { JsonObject } from './stable-json';
import { normalizeSvgBytes } from './svg-normalize';

// 피그마 API를 읽어 순수 데이터로 옮기는 얇은 층. 변환 규칙은 design-tokens.ts, naming.ts에 둔다.

/** 내보낸 변형 하나 */
export type ExportedVariant = {
  nodeId: string;
  properties: Record<string, string>;
  width: number;
  height: number;
  renderBounds: RenderBounds;
  /** 변형 루트와 그 아래 레이어 정보(export.json 계약) */
  layers: JsonObject[];
  png: Uint8Array;
  /** vector 레이어 SVG. 파일 이름(내용 SHA-256 + .svg) → 내용 */
  svgs: Map<string, Uint8Array>;
};

/**
 * "01 · Components" 페이지의 컴포넌트 세트와 단독 컴포넌트를 문서 순서대로 찾는다.
 * @returns 컴포넌트 목록
 */
export async function listComponents(): Promise<ComponentSummary[]> {
  const page = await loadComponentsPage();
  const nodes = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  const summaries: ComponentSummary[] = [];
  for (const node of nodes) {
    if (node.type === 'COMPONENT_SET') {
      summaries.push({
        id: node.id,
        name: node.name,
        kind: node.type,
        variantCount: variantsOf(node).length,
      });
    } else if (node.parent?.type !== 'COMPONENT_SET') {
      summaries.push({ id: node.id, name: node.name, kind: node.type, variantCount: 1 });
    }
  }
  return summaries;
}

/**
 * 컴포넌트(세트)의 모든 변형을 PNG로 내보낸다. 노드를 그대로 내보내 배경은 투명이다.
 * 그림자는 노드 상자 밖으로 그려지므로 노드 왼쪽 위 기준 렌더링 영역을 함께 기록한다.
 * 값 비교에 쓰는 레이어 정보(위치·크기, 자동 배치, 칠·선 토큰, 글자)와 vector 레이어 SVG도 함께 읽는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
 * @param nodeId 컴포넌트 세트나 단독 컴포넌트 ID
 * @returns 컴포넌트 이름, ID, 변형 목록
 */
export async function exportComponent(
  nodeId: string,
): Promise<{ name: string; nodeId: string; variants: ExportedVariant[] }> {
  await loadComponentsPage();
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT')) {
    throw new Error(`컴포넌트 ${nodeId}를 찾을 수 없다.`);
  }
  const components = node.type === 'COMPONENT_SET' ? variantsOf(node) : [node];
  const variants: ExportedVariant[] = [];
  const names = new Map<string, string | undefined>();
  for (const component of components) {
    const png = await component.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: SCALE },
    });
    const tree = await readLayerTree(component, names);
    const svgs = new Map<string, Uint8Array>();
    const svgFiles = new Map<string, string>();
    for (const id of vectorLayerIds(tree)) {
      const svg = normalizeSvgBytes(await exportVectorSvg(id));
      const file = `${sha256Hex(svg)}.svg`;
      svgs.set(file, svg);
      svgFiles.set(id, file);
    }
    variants.push({
      nodeId: component.id,
      properties: node.type === 'COMPONENT_SET' ? { ...component.variantProperties } : {},
      width: component.width,
      height: component.height,
      renderBounds: renderBoundsOf(component),
      layers: buildLayers(tree, svgFiles),
      png,
      svgs,
    });
  }
  return { name: node.name, nodeId: node.id, variants };
}

/**
 * Variables와 글자·효과·칠 스타일을 읽는다. 컬렉션마다 기본 모드 값을 쓴다.
 * @returns 토큰 변환 입력
 */
export async function readDesignTokensInput(): Promise<DesignTokensInput> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const aliasNames: Record<string, string> = {};
  const inputs: VariableInput[] = [];

  for (const variable of variables) {
    aliasNames[variable.id] = variable.name;
    const collection = collectionById.get(variable.variableCollectionId);
    if (collection === undefined) {
      throw new Error(`변수 ${variable.name}의 컬렉션을 찾을 수 없다.`);
    }
    const value = variable.valuesByMode[collection.defaultModeId];
    inputs.push({
      id: variable.id,
      name: variable.name,
      collection: collection.name,
      resolvedType: variable.resolvedType,
      scopes: [...variable.scopes],
      value: value === undefined ? unsupported('기본 모드 값 없음') : variableValue(value),
    });
  }

  const textStyles = await figma.getLocalTextStylesAsync();
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const paintStyles = await figma.getLocalPaintStylesAsync();
  const input: DesignTokensInput = {
    variables: inputs,
    aliasNames,
    textStyles: textStyles.map(textStyleInput),
    effectStyles: effectStyles.map((style) => ({
      name: style.name,
      effects: style.effects.map(effectInput),
    })),
    paintStyles: paintStyles.map((style) => ({
      name: style.name,
      paints: style.paints.map(paintInput),
    })),
  };
  await addRemoteAliasNames(input, aliasNames);
  return input;
}

/**
 * 컴포넌트 페이지를 불러온다. `documentAccess: dynamic-page`라 페이지 내용을 먼저 불러와야 한다.
 * @returns 컴포넌트 페이지
 */
async function loadComponentsPage(): Promise<PageNode> {
  const page = await figma.getNodeByIdAsync(COMPONENTS_PAGE_ID);
  if (page?.type !== 'PAGE') {
    throw new Error(`컴포넌트 페이지 ${COMPONENTS_PAGE_ID}를 찾을 수 없다.`);
  }
  await page.loadAsync();
  return page;
}

/**
 * 컴포넌트 세트의 변형(컴포넌트)만 고른다.
 * @param set 컴포넌트 세트
 * @returns 변형 목록
 */
function variantsOf(set: ComponentSetNode): ComponentNode[] {
  return set.children.filter((child): child is ComponentNode => child.type === 'COMPONENT');
}

/**
 * 노드 상자 왼쪽 위를 원점으로 한 렌더링 영역을 계산한다. 그려지는 것이 없으면 노드 상자다.
 * @param node 변형 노드
 * @returns 렌더링 영역
 */
function renderBoundsOf(node: ComponentNode): RenderBounds {
  const box = node.absoluteBoundingBox;
  const render = node.absoluteRenderBounds;
  if (box === null || render === null) {
    return { x: 0, y: 0, width: node.width, height: node.height };
  }
  return { x: render.x - box.x, y: render.y - box.y, width: render.width, height: render.height };
}

/**
 * 피그마 변수 값을 변환 입력 값으로 옮긴다.
 * @param value 피그마 변수 값
 * @returns 변환 입력 값
 */
function variableValue(value: VariableValue): VariableValueInput {
  if (typeof value !== 'object') {
    return value;
  }
  if ('type' in value && value.type === 'VARIABLE_ALIAS') {
    return { type: 'VARIABLE_ALIAS', id: value.id };
  }
  if ('r' in value && 'g' in value && 'b' in value) {
    return { r: value.r, g: value.g, b: value.b, a: 'a' in value ? value.a : 1 };
  }
  return unsupported('색·숫자·문자열·별칭이 아닌 값');
}

/**
 * 글자 스타일을 변환 입력으로 옮긴다.
 * @param style 피그마 글자 스타일
 * @returns 변환 입력
 */
function textStyleInput(style: TextStyle): TextStyleInput {
  const bound = style.boundVariables ?? {};
  return {
    name: style.name,
    fontFamily: style.fontName.family,
    fontStyle: style.fontName.style,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    boundVariables: {
      fontFamily: alias(bound.fontFamily),
      fontStyle: alias(bound.fontStyle),
      fontWeight: alias(bound.fontWeight),
      fontSize: alias(bound.fontSize),
      lineHeight: alias(bound.lineHeight),
      letterSpacing: alias(bound.letterSpacing),
    },
  };
}

/**
 * 효과 하나를 변환 입력으로 옮긴다. 그림자와 일반 흐림 밖의 효과는 지원하지 않는 값으로 표시한다.
 * @param effect 피그마 효과
 * @returns 변환 입력
 */
function effectInput(effect: Effect): EffectInput {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const bound = effect.boundVariables ?? {};
    return {
      type: effect.type,
      visible: effect.visible,
      color: { ...effect.color },
      offsetX: effect.offset.x,
      offsetY: effect.offset.y,
      radius: effect.radius,
      spread: effect.spread ?? 0,
      boundVariables: {
        color: alias(bound.color),
        radius: alias(bound.radius),
        spread: alias(bound.spread),
        offsetX: alias(bound.offsetX),
        offsetY: alias(bound.offsetY),
      },
    };
  }
  if (
    (effect.type === 'BACKGROUND_BLUR' || effect.type === 'LAYER_BLUR') &&
    effect.blurType === 'NORMAL'
  ) {
    return {
      type: effect.type,
      visible: effect.visible,
      radius: effect.radius,
      boundVariables: { radius: alias(effect.boundVariables?.radius) },
    };
  }
  const description = 'blurType' in effect ? `${effect.type} ${effect.blurType}` : effect.type;
  return { ...unsupported(description), visible: effect.visible };
}

/**
 * 칠 하나를 변환 입력으로 옮긴다. 단색과 이미지 밖의 칠은 지원하지 않는 값으로 표시한다.
 * @param paint 피그마 칠
 * @returns 변환 입력
 */
function paintInput(paint: Paint): PaintInput {
  const isVisible = paint.visible ?? true;
  const opacity = paint.opacity ?? 1;
  const blendMode = paint.blendMode ?? 'NORMAL';
  if (paint.type === 'SOLID') {
    return {
      type: 'SOLID',
      visible: isVisible,
      opacity,
      blendMode,
      color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
      boundVariables: { color: alias(paint.boundVariables?.color) },
    };
  }
  if (paint.type === 'IMAGE') {
    return {
      type: 'IMAGE',
      visible: isVisible,
      opacity,
      blendMode,
      imageHash: paint.imageHash,
      scaleMode: paint.scaleMode,
      scalingFactor: paint.scalingFactor,
    };
  }
  if (
    paint.type === 'GRADIENT_LINEAR' ||
    paint.type === 'GRADIENT_RADIAL' ||
    paint.type === 'GRADIENT_ANGULAR' ||
    paint.type === 'GRADIENT_DIAMOND'
  ) {
    return {
      type: paint.type,
      visible: isVisible,
      opacity,
      blendMode,
      gradientStops: paint.gradientStops.map(gradientStopInput),
      gradientTransform: paint.gradientTransform.map((row) => [...row]),
    };
  }
  return { ...unsupported(paint.type), visible: isVisible };
}

/**
 * 그라디언트 색 지점을 변환 입력으로 옮긴다.
 * @param stop 피그마 색 지점
 * @returns 변환 입력
 */
function gradientStopInput(stop: ColorStop): GradientStopInput {
  return {
    color: { r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a },
    position: stop.position,
    boundVariables: { color: alias(stop.boundVariables?.color) },
  };
}

/**
 * 칠 하나에 묶인 변수 별칭 목록을 모은다(단색 색, 그라디언트 색 지점).
 * @param paint 변환 입력 칠
 * @returns 별칭 묶음 목록
 */
function paintBindings(paint: PaintInput): Partial<Record<string, VariableAlias>>[] {
  if (paint.type === 'SOLID') {
    return [paint.boundVariables];
  }
  return 'gradientStops' in paint ? paint.gradientStops.map((stop) => stop.boundVariables) : [];
}

/**
 * 다른 파일(라이브러리) 변수를 가리키는 별칭의 이름을 채운다.
 * @param input 토큰 변환 입력
 * @param aliasNames 채울 별칭 이름표
 */
async function addRemoteAliasNames(
  input: DesignTokensInput,
  aliasNames: Record<string, string>,
): Promise<void> {
  const ids = new Set<string>();
  for (const variable of input.variables) {
    if (typeof variable.value === 'object' && 'type' in variable.value) {
      if (variable.value.type === 'VARIABLE_ALIAS') {
        ids.add(variable.value.id);
      }
    }
  }
  const boundSets: Partial<Record<string, VariableAlias>>[] = [
    ...input.textStyles.map((style) => style.boundVariables),
    ...input.effectStyles.flatMap((style) =>
      style.effects.map((effect) => ('boundVariables' in effect ? effect.boundVariables : {})),
    ),
    ...input.paintStyles.flatMap((style) => style.paints.flatMap(paintBindings)),
  ];
  for (const bound of boundSets) {
    for (const value of Object.values(bound)) {
      if (value !== undefined) {
        ids.add(value.id);
      }
    }
  }
  for (const id of ids) {
    if (!(id in aliasNames)) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable !== null) {
        aliasNames[id] = variable.name;
      }
    }
  }
}

/**
 * 피그마 별칭을 변환 입력 별칭으로 옮긴다.
 * @param value 피그마 별칭
 * @returns 변환 입력 별칭, 없으면 undefined
 */
function alias(value: VariableAlias | undefined): VariableAlias | undefined {
  return value === undefined ? undefined : { type: 'VARIABLE_ALIAS', id: value.id };
}

/**
 * 지원하지 않는 값 표시를 만든다.
 * @param description 무엇이 지원되지 않는지
 * @returns 지원하지 않는 값
 */
function unsupported(description: string): { type: 'UNSUPPORTED'; description: string } {
  return { type: 'UNSUPPORTED', description };
}
