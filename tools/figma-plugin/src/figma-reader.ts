import type { AssetRef, ComponentPage } from '../../../packages/design-system/src/figma-contract';
import { type CanvasBox, compareRankPaths, readingOrder } from './canvas-order';
import { componentPageOf } from './component-pages';
import { assetGroupOf } from './core/asset-groups';
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
import { COMPONENT_PAGES, FOUNDATIONS_PAGE } from './plugin-config';
import type { UsageInput, UsageStyle, UsageVariable } from './unused-tokens';

// 피그마 API를 읽어 순수 데이터로 옮기는 얇은 층. 변환 규칙은 design-tokens.ts, naming.ts, core/에 둔다.

// 피그마가 사용자 기능 플래그로 막은 API를 부르면 나오는 오류 문장이다.
const UNSUPPORTED_API_TEXT = 'is not a supported API';

/** 내보내는 컴포넌트(세트이거나 변형이 없는 컴포넌트)와 그 페이지 */
export type PageComponent = { node: ComponentSetNode | ComponentNode; page: ComponentPage };

/**
 * Controls·Shell·Blog 페이지의 컴포넌트 세트와 변형이 없는 컴포넌트를 모두 찾는다. 페이지는 이름으로 찾고,
 * 컴포넌트를 감싼 틀의 모양은 보지 않는다. 이름으로 거르지 않는다.
 * @codocs [[디자인 시스템:내보낼 대상]]
 * @returns 컴포넌트와 페이지
 */
export async function listComponentNodes(): Promise<PageComponent[]> {
  const result: PageComponent[] = [];
  for (const page of figma.root.children) {
    const name = componentPageOf(page.name);
    if (name === null) {
      continue;
    }
    await page.loadAsync();
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
      if (node.type === 'COMPONENT_SET' || node.parent?.type !== 'COMPONENT_SET') {
        result.push({ node, page: name });
      }
    }
  }
  return result;
}

/**
 * 대상 목록에 보이는 컴포넌트를 페이지 순서(Controls → Shell → Blog), 페이지 안은 캔버스 순서로 만든다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @returns 컴포넌트 목록
 */
export async function listComponents(): Promise<ComponentSummary[]> {
  const nodes = await listComponentNodes();
  const summaries: ComponentSummary[] = nodes.map(
    /**
     * 컴포넌트 하나를 목록 항목으로 옮긴다.
     * @param item 컴포넌트와 페이지
     * @param item.node 컴포넌트
     * @param item.page 페이지
     * @returns 목록 항목
     */
    ({ node, page }) => ({
      id: node.id,
      name: node.name,
      page,
      variantCount:
        node.type === 'COMPONENT_SET'
          ? node.children.filter((child) => child.type === 'COMPONENT').length
          : 1,
    }),
  );
  const sorted = await sortByCanvasOrder(summaries);
  return COMPONENT_PAGES.flatMap((page) => sorted.filter((summary) => summary.page === page));
}

/**
 * 컴포넌트 세트의 변형 하나가 고른 축 값을 읽는다. 변형 이름 대신 피그마가 정한 값을 쓴다.
 * @codocs [[디자인 시스템:스키마]]
 * @param component 컴포넌트
 * @returns 변형 축 이름 → 값. 세트의 변형이 아니면 빈 객체
 */
export function variantValuesOf(component: ComponentNode): Record<string, string> {
  return component.parent?.type === 'COMPONENT_SET' ? { ...component.variantProperties } : {};
}

/**
 * 노드가 놓인 페이지 이름과 조상 이름(페이지 바로 아래부터 가장 가까운 것까지)을 읽는다.
 * @param node 노드
 * @returns 페이지 이름과 조상 이름
 */
export function placeOf(node: BaseNode): { page: string; ancestors: string[] } {
  const ancestors: string[] = [];
  for (let current = node.parent; current !== null; current = current.parent) {
    if (current.type === 'PAGE') {
      return { page: current.name, ancestors };
    }
    ancestors.unshift(current.name);
  }
  return { page: '', ancestors };
}

/**
 * 자산 하나.
 * - ref: 자산 참조(묶음, 피그마 이름, 파일 이름)
 * - node: 자산 원본 컴포넌트
 */
export type AssetComponent = { ref: AssetRef; node: ComponentNode };

/**
 * Foundations 페이지의 자산 컴포넌트를 모두 찾는다. 묶음은 원본 컴포넌트가 놓인 구역으로 정한다.
 * @codocs [[디자인 시스템:자산]]
 * @returns 자산 목록(페이지 안 순서)
 */
export async function listAssetComponents(): Promise<AssetComponent[]> {
  const result: AssetComponent[] = [];
  for (const page of figma.root.children) {
    if (page.name !== FOUNDATIONS_PAGE) {
      continue;
    }
    await page.loadAsync();
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT'] })) {
      const place = placeOf(node);
      const group = assetGroupOf(place.page, place.ancestors);
      if (group !== null) {
        result.push({
          ref: { group, name: node.name, file: assetName({ group, name: node.name }) },
          node,
        });
      }
    }
  }
  return result;
}

/**
 * 이름 있는 이미지 자산(Images 묶음에서 이미지 칠 하나만 가진 컴포넌트)의 이미지 해시 → 자산 표를 만든다.
 * 토큰의 이미지 칠과 컴포넌트의 이미지 칠은 이 표로 자산을 얻고, 구조 검사는 이 표에 없는 이미지를 막는다.
 * @codocs [[디자인 시스템:자산]]
 * @param assets 자산 목록. 없으면 새로 찾는다
 * @returns 이미지 해시 → 자산
 */
export async function readImageAssets(
  assets?: readonly AssetComponent[],
): Promise<Map<string, AssetComponent>> {
  const images = new Map<string, AssetComponent>();
  for (const asset of assets ?? (await listAssetComponents())) {
    if (asset.ref.group !== 'Images') {
      continue;
    }
    const { node } = asset;
    const fills =
      node.fills === figma.mixed ? [] : node.fills.filter((fill) => fill.visible !== false);
    const [fill] = fills;
    if (fills.length === 1 && fill?.type === 'IMAGE' && fill.imageHash !== null) {
      images.set(fill.imageHash, asset);
    }
  }
  return images;
}

/**
 * Foundations와 컴포넌트 페이지의 컴포넌트·세트를 키로 찾는 표를 만든다. 인스턴스 교체 속성의 선호값은 키로만 온다.
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @returns 키 → 컴포넌트나 세트
 */
export async function componentsByKey(): Promise<Map<string, ComponentNode | ComponentSetNode>> {
  const result = new Map<string, ComponentNode | ComponentSetNode>();
  for (const page of figma.root.children) {
    if (page.name !== FOUNDATIONS_PAGE && componentPageOf(page.name) === null) {
      continue;
    }
    await page.loadAsync();
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
      result.set(node.key, node);
    }
  }
  return result;
}

/**
 * 노드를 피그마 캔버스에서 읽는 순서로 정렬한다. 페이지 바로 아래부터 조상마다 형제 사이 순서(위→아래 행, 행 안 왼→오른)를 구해
 * 바깥 묶음 순서부터 비교한다. 찾지 못한 노드는 뒤에 둔다.
 * @codocs [[디자인 시스템:플러그인 화면]]
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
    const modes = otherModeValues(variable, collection);
    inputs.push({
      id: variable.id,
      name: variable.name,
      collection: collection.name,
      resolvedType: variable.resolvedType,
      scopes: [...variable.scopes],
      value: value === undefined ? unsupported('기본 모드 값 없음') : variableValue(value),
      ...(Object.keys(modes).length === 0 ? {} : { modes }),
      ...(variable.description === '' ? {} : { description: variable.description }),
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
    effectStyles: effectStyles.map(
      /**
       * 효과 스타일을 변환 입력으로 옮긴다.
       * @param style 피그마 효과 스타일
       * @returns 변환 입력
       */
      (style) => ({
        name: style.name,
        effects: style.effects.map(effectInput),
        description: style.description,
      }),
    ),
    paintStyles: paintStyles.map(
      /**
       * 칠 스타일을 변환 입력으로 옮긴다.
       * @param style 피그마 칠 스타일
       * @returns 변환 입력
       */
      (style) => ({
        name: style.name,
        paints: style.paints.map(paintInput),
        description: style.description,
      }),
    ),
    imageAssets: Object.fromEntries([...images].map(([hash, image]) => [hash, image.ref.file])),
  };
  await addRemoteAliasNames(input, aliasNames);
  return input;
}

/**
 * 기본 모드가 아닌 모드의 값을 읽는다. 기본 값과 같은 모드는 적지 않고, 값이 없는 모드는 지원하지 않는 값으로 표시해 막는다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param variable 변수
 * @param collection 변수의 컬렉션
 * @returns 모드 이름 → 값
 */
function otherModeValues(
  variable: Variable,
  collection: VariableCollection,
): Record<string, VariableValueInput> {
  const base = JSON.stringify(variable.valuesByMode[collection.defaultModeId]);
  const result: Record<string, VariableValueInput> = {};
  for (const mode of collection.modes) {
    const value = variable.valuesByMode[mode.modeId];
    if (mode.modeId === collection.defaultModeId) {
      continue;
    }
    if (value === undefined) {
      result[mode.name] = unsupported(`모드 ${mode.name} 값 없음`);
    } else if (JSON.stringify(value) !== base) {
      result[mode.name] = variableValue(value);
    }
  }
  return result;
}

/**
 * 쓰는 곳이 없는 변수·스타일을 찾으려고 변수 별칭, 스타일 사용처, 모든 페이지 노드의 변수·스타일 연결을 읽는다.
 * 글자 일부 구간에만 입힌 글자·칠 스타일은 스타일 사용처(getStyleConsumersAsync)에 나오지 않아 구간에서 따로 읽는다.
 * 페이지를 하나씩 불러와 노드를 훑으므로 파일이 크면 시간이 걸린다.
 * @codocs [[디자인 시스템:구조 검사]]
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
 * @codocs [[디자인 시스템:구조 검사]]
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
    if (!(error instanceof Error) || !error.message.includes(UNSUPPORTED_API_TEXT)) {
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
    description: style.description,
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
      isVisible: effect.visible,
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
      isVisible: effect.visible,
      radius: effect.radius,
      boundVariables: { radius: alias(effect.boundVariables?.radius) },
    };
  }
  const description = 'blurType' in effect ? `${effect.type} ${effect.blurType}` : effect.type;
  return { ...unsupported(description), isVisible: effect.visible };
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
      isVisible,
      opacity,
      blendMode,
      color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
      boundVariables: { color: alias(paint.boundVariables?.color) },
    };
  }
  if (paint.type === 'IMAGE') {
    return {
      type: 'IMAGE',
      isVisible,
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
      isVisible,
      opacity,
      blendMode,
      gradientStops: paint.gradientStops.map(gradientStopInput),
      gradientTransform: paint.gradientTransform.map((row) => [...row]),
    };
  }
  return { ...unsupported(paint.type), isVisible };
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
