import { type CanvasBox, compareRankPaths, readingOrder } from './canvas-order';
import { ASSET_GROUP_PREFIX, ASSET_GROUPS } from './core/asset-groups';
import type { CheckContext } from './core/check-structure';
import { isMotionApiError } from './core/read-motion';
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
import type { ComponentSummary } from './messages';
import { assetName } from './naming';
import { COMPONENTS_PAGE_ID, PATTERNS_PAGE_ID } from './plugin-config';
import type { UsageInput, UsageStyle, UsageVariable } from './unused-tokens';

// 피그마 API를 읽어 순수 데이터로 옮기는 얇은 층. 변환 규칙은 design-tokens.ts, naming.ts에 둔다.

/** 섹션 밖에 놓인 컴포넌트, `영역/이름` 꼴이 아닌 조립의 묶음 이름 */
const UNGROUPED = '묶음 밖';

/**
 * "01 · Components" 페이지의 컴포넌트 세트와 단독 컴포넌트를 캔버스 순서로 찾는다. 묶음은 영역 섹션(페이지 바로 아래 섹션)이다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @returns 컴포넌트 목록
 */
export async function listComponents(): Promise<ComponentSummary[]> {
  return listPageComponents(await loadPage(COMPONENTS_PAGE_ID), areaSectionName);
}

/**
 * "02 · Patterns" 페이지의 조립(컴포넌트 세트와 단독 컴포넌트)을 캔버스 순서로 찾는다. 묶음은 이름의 영역(조립 PR 단위)이다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:플러그인 화면]]
 * @returns 조립 목록
 */
export async function listPatterns(): Promise<ComponentSummary[]> {
  return listPageComponents(await loadPage(PATTERNS_PAGE_ID), patternAreaName);
}

/**
 * 노드를 피그마 캔버스에서 읽는 순서로 정렬한다. 페이지 바로 아래부터 조상마다 형제 사이 순서(위→아래 행, 행 안 왼→오른)를 구해
 * 바깥 묶음 순서부터 비교한다. 찾지 못한 노드는 뒤에 둔다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param items 노드 ID를 가진 항목
 * @returns 캔버스 순서로 정렬한 새 배열
 */
export async function sortByCanvasOrder<T extends { readonly id: string }>(
  items: readonly T[],
): Promise<T[]> {
  const ranks = new Map<string, Map<string, number>>();
  const paths = new Map<string, number[]>();
  for (const item of items) {
    const node = await figma.getNodeByIdAsync(item.id);
    paths.set(item.id, node === null ? [Number.MAX_SAFE_INTEGER] : rankPath(node, ranks));
  }
  return [...items].sort((a, b) => compareRankPaths(paths.get(a.id) ?? [], paths.get(b.id) ?? []));
}

/**
 * 페이지의 컴포넌트 세트와 세트 밖 단독 컴포넌트를 찾아 캔버스 순서로 정렬한다.
 * @param page 불러온 페이지
 * @param groupOf 노드의 묶음 이름을 정하는 함수
 * @returns 컴포넌트 목록
 */
async function listPageComponents(
  page: PageNode,
  groupOf: (node: ComponentSetNode | ComponentNode) => string,
): Promise<ComponentSummary[]> {
  const nodes = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  const summaries: ComponentSummary[] = [];
  for (const node of nodes) {
    if (node.type === 'COMPONENT_SET') {
      summaries.push({
        id: node.id,
        name: node.name,
        kind: node.type,
        variantCount: variantsOf(node).length,
        group: groupOf(node),
      });
    } else if (node.parent?.type !== 'COMPONENT_SET') {
      summaries.push({
        id: node.id,
        name: node.name,
        kind: node.type,
        variantCount: 1,
        group: groupOf(node),
      });
    }
  }
  return sortByCanvasOrder(summaries);
}

/**
 * 노드가 든 영역 섹션(페이지 바로 아래 섹션)의 이름을 구한다.
 * @param node 컴포넌트
 * @returns 영역 섹션 이름, 섹션 밖이면 `묶음 밖`
 */
function areaSectionName(node: BaseNode): string {
  let current: BaseNode = node;
  while (current.parent !== null && current.parent.type !== 'PAGE') {
    current = current.parent;
  }
  return current !== node && current.type === 'SECTION' ? current.name : UNGROUPED;
}

/**
 * 조립 이름의 영역(`Menu/Folder` → `Menu`)을 구한다.
 * @param node 조립
 * @returns 영역 이름, `영역/이름` 꼴이 아니면 `묶음 밖`
 */
function patternAreaName(node: BaseNode): string {
  const parts = node.name.split('/').map((part) => part.trim());
  const [area, rest] = parts;
  return parts.length === 2 &&
    area !== undefined &&
    area !== '' &&
    rest !== undefined &&
    rest !== ''
    ? area
    : UNGROUPED;
}

/**
 * 페이지 바로 아래부터 노드까지 조상마다 형제 사이 순위를 구한다.
 * @param node 노드
 * @param ranks 부모 ID → 자식 ID → 순위(캐시)
 * @returns 순위 경로
 */
function rankPath(node: BaseNode, ranks: Map<string, Map<string, number>>): number[] {
  const path: number[] = [];
  let current: BaseNode = node;
  while (current.parent !== null && current.parent.type !== 'DOCUMENT') {
    const { parent } = current;
    let order = ranks.get(parent.id);
    if (order === undefined) {
      order = siblingOrder(parent);
      ranks.set(parent.id, order);
    }
    path.unshift(order.get(current.id) ?? Number.MAX_SAFE_INTEGER);
    current = parent;
  }
  return path;
}

/**
 * 부모의 자식을 읽는 순서로 번호 매긴다.
 * @param parent 부모 노드
 * @returns 자식 ID → 순위
 */
function siblingOrder(parent: BaseNode & ChildrenMixin): Map<string, number> {
  const boxes = parent.children.map((child) => boxOf(child));
  return new Map(readingOrder(boxes).map((id, index) => [id, index]));
}

/**
 * 노드의 부모 기준 위치와 크기를 읽는다.
 * @param child 노드
 * @returns 위치와 크기
 */
function boxOf(child: SceneNode): CanvasBox {
  return {
    id: child.id,
    x: child.x,
    y: child.y,
    width: child.width,
    height: child.height,
  };
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
  const images = await readImageAssets();
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
    imageAssets: Object.fromEntries([...images].map(([hash, image]) => [hash, image.name])),
  };
  await addRemoteAliasNames(input, aliasNames);
  return input;
}

/**
 * 쓰는 곳이 없는 변수·스타일을 찾으려고 변수 별칭, 스타일 사용처, 모든 페이지 노드의 변수·스타일 연결을 읽는다.
 * 글자 일부 구간에만 입힌 글자·칠 스타일은 스타일 사용처(getStyleConsumersAsync)에 나오지 않아 구간에서 따로 읽는다.
 * 페이지를 하나씩 불러와 노드를 훑으므로 파일이 크면 시간이 걸린다.
 * @codocs [[피그마 연동:구조 검사]]
 * @returns 사용처 계산 입력
 */
export async function readUsageInput(): Promise<UsageInput> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const styles: UsageStyle[] = [];
  const kinds = [
    ['paint', await figma.getLocalPaintStylesAsync()],
    ['text', await figma.getLocalTextStylesAsync()],
    ['effect', await figma.getLocalEffectStylesAsync()],
  ] as const;
  for (const [kind, list] of kinds) {
    for (const style of list) {
      const ids = new Set<string>();
      collectAliasIds(style.boundVariables, ids);
      if (style.type === 'PAINT') {
        collectAliasIds(style.paints, ids);
      } else if (style.type === 'EFFECT') {
        collectAliasIds(style.effects, ids);
      }
      styles.push({
        id: style.id,
        name: style.name,
        kind,
        consumerCount: (await style.getStyleConsumersAsync()).length,
        variableIds: [...ids],
      });
    }
  }
  const usage: NodeUsage = { variableIds: new Set(), styleIds: new Set() };
  for (const page of figma.root.children) {
    await page.loadAsync();
    for (const node of page.findAll(() => true)) {
      collectNodeUsage(node, usage);
    }
  }
  return {
    variables: variables.map(usageVariable),
    styles,
    nodeVariableIds: usage.variableIds,
    nodeStyleIds: usage.styleIds,
  };
}

/** 컴포넌트 하나가 쓰는 토큰 */
export type ComponentTokenUsage = {
  id: string;
  name: string;
  /** 연결된 변수 이름과 스타일 이름 */
  tokens: Set<string>;
};

/**
 * "01 · Components" 페이지의 컴포넌트마다 쓰는 변수와 스타일 이름을 읽는다. 인스턴스 안쪽 레이어도 본다.
 * 바뀐 토큰을 쓰는 컴포넌트를 찾아 토큰 PR에 그 변형 PNG를 다시 넣는 데 쓴다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @returns 컴포넌트마다 쓰는 토큰 이름
 */
export async function readComponentTokenUsage(): Promise<ComponentTokenUsage[]> {
  const variableNames = new Map<string, string | undefined>();
  const styleNames = new Map<string, string | undefined>();
  const result: ComponentTokenUsage[] = [];
  for (const summary of await listComponents()) {
    const node = await figma.getNodeByIdAsync(summary.id);
    if (node === null || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT')) {
      continue;
    }
    const usage: NodeUsage = { variableIds: new Set(), styleIds: new Set() };
    for (const item of [node, ...node.findAll(() => true)]) {
      collectNodeUsage(item, usage);
    }
    const tokens = new Set<string>();
    for (const id of usage.variableIds) {
      if (!variableNames.has(id)) {
        variableNames.set(id, (await figma.variables.getVariableByIdAsync(id))?.name);
      }
      const name = variableNames.get(id);
      if (name !== undefined) {
        tokens.add(name);
      }
    }
    for (const id of usage.styleIds) {
      if (!styleNames.has(id)) {
        styleNames.set(id, (await figma.getStyleByIdAsync(id))?.name);
      }
      const name = styleNames.get(id);
      if (name !== undefined) {
        tokens.add(name);
      }
    }
    result.push({ id: summary.id, name: summary.name, tokens });
  }
  return result;
}

/** 노드가 쓰는 변수 ID와 스타일 ID */
export type NodeUsage = { variableIds: Set<string>; styleIds: Set<string> };

/**
 * 노드 하나에 연결된 변수와 스타일을 모은다. 칠·선·효과 안의 연결과, 글자 일부 구간에만 입힌 글자·칠 스타일과 변수도 모은다.
 * @param node 노드
 * @param usage 모을 곳
 */
export function collectNodeUsage(node: SceneNode, usage: NodeUsage): void {
  collectAliasIds('boundVariables' in node ? node.boundVariables : undefined, usage.variableIds);
  for (const key of ['fills', 'strokes', 'effects'] as const) {
    const value: unknown = key in node ? Reflect.get(node, key) : undefined;
    if (Array.isArray(value)) {
      collectAliasIds(value, usage.variableIds);
    }
  }
  collectKeyframeVariableIds(node, usage.variableIds);
  for (const key of ['fillStyleId', 'strokeStyleId', 'effectStyleId', 'textStyleId'] as const) {
    const id: unknown = key in node ? Reflect.get(node, key) : undefined;
    if (typeof id === 'string' && id !== '') {
      usage.styleIds.add(id);
    }
  }
  if (node.type !== 'TEXT') {
    return;
  }
  for (const segment of node.getStyledTextSegments([
    'textStyleId',
    'fillStyleId',
    'fills',
    'boundVariables',
  ])) {
    for (const id of [segment.textStyleId, segment.fillStyleId]) {
      if (id !== '') {
        usage.styleIds.add(id);
      }
    }
    collectAliasIds(segment.fills, usage.variableIds);
    collectAliasIds(segment.boundVariables, usage.variableIds);
  }
}

/**
 * 노드의 키프레임 트랙(`manualKeyframeTracks`)에서 키프레임 이징이 연결한 변수(EASING 변수 별칭)를 모은다.
 * 효과·칠 등 다른 트랙 안의 같은 모양도 함께 센다. 모션 API를 쓸 수 없는 계정이면 건너뛴다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 노드
 * @param ids 모을 곳
 */
function collectKeyframeVariableIds(node: SceneNode, ids: Set<string>): void {
  if (!('manualKeyframeTracks' in node)) {
    return;
  }
  try {
    collectAliasIds(node.manualKeyframeTracks, ids);
  } catch (error) {
    if (!isMotionApiError(error)) {
      throw error;
    }
  }
}

/**
 * 변수 하나의 별칭 대상을 읽는다.
 * @param variable 피그마 변수
 * @returns 사용처 계산용 변수
 */
function usageVariable(variable: Variable): UsageVariable {
  const ids = new Set<string>();
  collectAliasIds(Object.values(variable.valuesByMode), ids);
  return { id: variable.id, name: variable.name, scopes: [...variable.scopes], aliasIds: [...ids] };
}

/**
 * 값 안의 모든 변수 별칭(`{ type: 'VARIABLE_ALIAS', id }`) ID를 모은다.
 * @param value 피그마 값(객체·배열 중첩 가능)
 * @param ids 모을 곳
 */
function collectAliasIds(value: unknown, ids: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectAliasIds(item, ids);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const type: unknown = Reflect.get(value, 'type');
  const id: unknown = Reflect.get(value, 'id');
  if (type === 'VARIABLE_ALIAS' && typeof id === 'string') {
    ids.add(id);
    return;
  }
  for (const item of Object.values(value)) {
    collectAliasIds(item, ids);
  }
}

/** 이미지 자산 하나 */
export type ImageAsset = {
  /** 자산 이름(`images/<자산>`, 확장자 없음) */
  name: string;
  /** 자산 컴포넌트 */
  node: ComponentNode;
};

/**
 * Foundations / Assets의 이미지 묶음(`group/Images`)에서 이미지 칠 하나만 가진 컴포넌트를 찾아
 * 이미지 해시 → 자산 표를 만든다. 토큰의 이미지 칠은 이 표로 자산 이름을 얻고,
 * 구조 검사는 이 표에 없는 이미지를 막는다. 묶음 프레임이 있는 첫 페이지만 읽는다.
 * @codocs [[피그마 연동:자산]]
 * @returns 이미지 해시 → 자산
 */
export async function readImageAssets(): Promise<Map<string, ImageAsset>> {
  const rasterGroups = new Set(
    Object.entries(ASSET_GROUPS)
      .filter(([, kind]) => kind === 'raster')
      .map(([group]) => `${ASSET_GROUP_PREFIX}${group}`),
  );
  const images = new Map<string, ImageAsset>();
  for (const page of figma.root.children) {
    await page.loadAsync();
    const frames = page.findAll((node) => rasterGroups.has(node.name) && 'children' in node);
    for (const frame of frames) {
      if (!('findAllWithCriteria' in frame)) {
        continue;
      }
      const group = frame.name.slice(ASSET_GROUP_PREFIX.length);
      for (const component of frame.findAllWithCriteria({ types: ['COMPONENT'] })) {
        const fills =
          component.fills === figma.mixed
            ? []
            : component.fills.filter((fill) => fill.visible !== false);
        const [fill] = fills;
        if (fills.length === 1 && fill?.type === 'IMAGE' && fill.imageHash !== null) {
          images.set(fill.imageHash, {
            name: assetName({ group, name: component.name }),
            node: component,
          });
        }
      }
    }
    if (frames.length > 0) {
      break;
    }
  }
  return images;
}

/**
 * 구조 검사에 쓰는 파일 정보(이름 있는 이미지 자산의 해시)를 읽는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @returns 검사 정보
 */
export async function readCheckContext(): Promise<CheckContext> {
  return {
    imageHashes: new Set((await readImageAssets()).keys()),
  };
}

/**
 * 페이지를 ID로 찾아 불러온다. `documentAccess: dynamic-page`라 페이지 내용을 먼저 불러와야 한다.
 * @param pageId 페이지 ID
 * @returns 불러온 페이지
 */
export async function loadPage(pageId: string): Promise<PageNode> {
  const page = await figma.getNodeByIdAsync(pageId);
  if (page?.type !== 'PAGE') {
    throw new Error(`페이지 ${pageId}를 찾을 수 없다.`);
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
  // EASING 변수 값(MotionEasing). 플러그인 API 문서에 없는 기능이라 모양을 하나씩 확인한다.
  if ('type' in value && typeof value.type === 'string') {
    const curve =
      'easingFunctionCubicBezier' in value ? value.easingFunctionCubicBezier : undefined;
    return {
      type: 'EASING',
      easingType: value.type,
      ...(curve === undefined
        ? {}
        : { cubicBezier: { x1: curve.x1, y1: curve.y1, x2: curve.x2, y2: curve.y2 } }),
    };
  }
  return unsupported('색·숫자·문자열·별칭·이징이 아닌 값');
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
    textDecoration: style.textDecoration,
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
