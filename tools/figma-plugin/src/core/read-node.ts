import {
  type AssetRef,
  childLayerKeys,
  type ComponentRef,
  type PropertyValue,
  type VariableRef,
} from '../../../../packages/design-system/src/figma-contract';
import { variantValuesOf } from '../figma-reader';
import { assetName } from '../naming';
import { canonicalCategoryName } from './annotation-category';
import { assetGroupOf, assetKinds } from './asset-groups';
import {
  bindingBase,
  type Bindings,
  inheritedBindings,
  overrideSourceId,
  sourceLayerId,
} from './bindings';
import type {
  AssetData,
  Bound,
  Corners,
  EffectData,
  InstanceData,
  LayoutData,
  NodeData,
  OverrideData,
  PaintData,
  PlacementData,
  Rgb,
  Sides,
  TextData,
  TextSegmentData,
} from './node-data';

// 피그마 노드를 node-data.ts의 순수 데이터로 읽는다. 변수는 컬렉션과 이름, 스타일은 이름으로 바꿔 둔다.
// 노드를 바꾸지 않는다(읽기 전용). GitHub와 UI는 모른다.

/** 동작의 종류를 적는 Dev Mode 주석 분류 */
const INTERACTION_CATEGORY = 'Interaction';
// 크기 비교에 쓰는 소수 오차다.
const EPSILON = 1e-6;
/** 인스턴스에서 덮어쓰면 원본과 값을 견주는 모양 필드(`NodeChangeProperty`) */
const appearanceFields: readonly string[] = [
  'fills',
  'strokes',
  'strokeWeight',
  // 피그마 타입 정의의 철자 그대로다(strokeTopWeight가 아니다).
  'stokeTopWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'effects',
  'opacity',
  'fillStyleId',
  'strokeStyleId',
  'effectStyleId',
];
/** 변수 연결(`boundVariables`)을 덮어쓰면 원본과 견주는 모양 필드 */
const appearanceBindings: readonly string[] = [
  'fills',
  'strokes',
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'effects',
  'opacity',
];

/**
 * 읽는 동안 쓰는 파일 정보와 캐시.
 * - imageAssets: 이미지 해시 → 이름 있는 Images 자산
 * - componentsByKey: 컴포넌트·세트 키 → 노드. 인스턴스 교체 속성의 선호값을 찾는다
 * - variables, styles, categories: ID → 이름 캐시
 * - behaviors: 컴포넌트(세트) ID → 동작의 종류 캐시
 * - assets: 원본 컴포넌트 ID → 자산 묶음 캐시
 */
export type ReadContext = {
  imageAssets: ReadonlyMap<string, AssetRef>;
  componentsByKey: ReadonlyMap<string, ComponentNode | ComponentSetNode>;
  variables: Map<string, VariableRef | undefined>;
  styles: Map<string, string | undefined>;
  categories: Map<string, string | undefined>;
  behaviors: Map<string, string | null>;
  assets: Map<string, AssetRef | null>;
};

/**
 * 비어 있는 캐시로 읽기 정보를 만든다.
 * @param imageAssets 이미지 해시 → 이름 있는 Images 자산
 * @param componentsByKey 컴포넌트·세트 키 → 노드
 * @returns 읽기 정보
 */
export function createReadContext(
  imageAssets: ReadonlyMap<string, AssetRef>,
  componentsByKey: ReadonlyMap<string, ComponentNode | ComponentSetNode>,
): ReadContext {
  return {
    imageAssets,
    componentsByKey,
    variables: new Map(),
    styles: new Map(),
    categories: new Map(),
    behaviors: new Map(),
    assets: new Map(),
  };
}

/**
 * 읽는 노드가 놓인 자리.
 * - nearestInstanceId: 노드를 품은 가장 가까운 인스턴스 ID. 변형에 바로 놓인 노드면 null
 * - slotKeys: 이 자리의 컴포넌트(변형이면 내보내는 컴포넌트, 인스턴스 안이면 그 원본)의 `SLOT` 속성 키와 이름
 */
type Scope = {
  nearestInstanceId: string | null;
  slotKeys: readonly string[];
};

/**
 * 변형 루트와 그 아래 노드를 모두 읽는다. 숨긴 노드도 읽는다(숨긴 레이어는 켜고 끄는 속성으로 그린다).
 * 품은 인스턴스는 안쪽까지 읽어 검증 자료와 검사에 쓰고, 자산 인스턴스는 안쪽을 읽지 않는다.
 * @codocs [[디자인 시스템:내보낼 대상]]
 * @codocs [[디자인 시스템:스키마]]
 * @param variant 변형 루트
 * @param slotKeys 내보내는 컴포넌트의 `SLOT` 속성 키
 * @param context 읽기 정보
 * @returns 노드 데이터
 */
export async function readVariantTree(
  variant: ComponentNode,
  slotKeys: readonly string[],
  context: ReadContext,
): Promise<NodeData> {
  return readNode(variant, '', null, { nearestInstanceId: null, slotKeys }, context);
}

/**
 * 노드 하나와 그 아래를 읽는다.
 * @param node 노드
 * @param key 레이어 키
 * @param parent 부모 노드(루트면 null)
 * @param scope 노드가 놓인 자리
 * @param context 읽기 정보
 * @returns 노드 데이터
 */
async function readNode(
  node: SceneNode,
  key: string,
  parent: (BaseNode & ChildrenMixin) | null,
  scope: Scope,
  context: ReadContext,
): Promise<NodeData> {
  const bound = await boundVariables(node, context);
  const data: NodeData = {
    id: node.id,
    name: node.name,
    type: node.type,
    key,
    isVisible: node.visible,
    isInsideInstance: scope.nearestInstanceId !== null,
    propertyRefs: propertyRefsOf(node),
    parentLayoutMode: parentLayoutMode(parent),
    opacity: { value: 'opacity' in node ? node.opacity : 1, variable: bound.opacity },
    rotation: 'rotation' in node ? node.rotation : 0,
    isMask: 'isMask' in node ? node.isMask : false,
    width: { value: node.width, variable: bound.width },
    height: { value: node.height, variable: bound.height },
    sizing: {
      horizontal: 'layoutSizingHorizontal' in node ? node.layoutSizingHorizontal : 'FIXED',
      vertical: 'layoutSizingVertical' in node ? node.layoutSizingVertical : 'FIXED',
    },
    minWidth: optionalBound('minWidth' in node ? node.minWidth : null, bound.minWidth),
    maxWidth: optionalBound('maxWidth' in node ? node.maxWidth : null, bound.maxWidth),
    minHeight: optionalBound('minHeight' in node ? node.minHeight : null, bound.minHeight),
    maxHeight: optionalBound('maxHeight' in node ? node.maxHeight : null, bound.maxHeight),
    aspectRatio: aspectRatioOf(node),
    box: 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null,
    fills: null,
    strokes: null,
    strokeAlign: 'strokeAlign' in node ? node.strokeAlign : 'INSIDE',
    dashPattern: 'dashPattern' in node ? node.dashPattern : [],
    hasVariableWidthStroke: false,
    hasComplexStroke: false,
    cornerSmoothing: 'cornerSmoothing' in node ? node.cornerSmoothing : 0,
    effects: null,
    layout: null,
    isClippingContent: 'clipsContent' in node && node.clipsContent,
    overflowDirection: 'overflowDirection' in node ? node.overflowDirection : 'NONE',
    isStrokeIncludedInLayout: 'strokesIncludedInLayout' in node && node.strokesIncludedInLayout,
    placement: parent === null ? null : placementOf(node),
    text: null,
    asset: null,
    instance: null,
    slotProperty: null,
    isSlotFilled: false,
    children: [],
  };

  if ('fills' in node) {
    data.fills = node.fills === figma.mixed ? 'mixed' : await paintsData(node.fills, context);
    data.fillStyle = await styleName('fillStyleId' in node ? node.fillStyleId : '', context);
  }
  if ('strokes' in node) {
    data.strokes = await paintsData(node.strokes, context);
    data.strokeStyle = await styleName(node.strokeStyleId, context);
    data.strokeWeight = strokeWeights(node, bound);
    if ('variableWidthStrokeProperties' in node) {
      const profile = node.variableWidthStrokeProperties;
      data.hasVariableWidthStroke = profile !== null && profile.widthProfile !== 'UNIFORM';
    }
    if ('complexStrokeProperties' in node) {
      data.hasComplexStroke = node.complexStrokeProperties.type !== 'BASIC';
    }
  }
  if ('cornerRadius' in node) {
    data.radius = corners(node, bound);
  }
  if ('effects' in node) {
    data.effects = node.effects.map(effectData);
    data.effectStyle = await styleName(node.effectStyleId, context);
  }
  if ('layoutMode' in node) {
    data.layout = layoutData(node, bound);
  }
  if (node.type === 'TEXT') {
    data.text = await textData(node, context);
  }
  if (node.type === 'SLOT') {
    data.slotProperty = slotPropertyOf(node, scope.slotKeys);
    data.isSlotFilled =
      scope.nearestInstanceId !== null && (await isSlotFilled(node, scope.nearestInstanceId));
  }
  let childScope = scope;
  if (node.type === 'INSTANCE') {
    const main = await node.getMainComponentAsync();
    data.instance = await instanceData(node, main, scope.nearestInstanceId === null, context);
    const asset = main === null ? null : await assetData(node, main, context);
    if (asset !== null) {
      data.asset = asset;
      return data;
    }
    childScope = { nearestInstanceId: node.id, slotKeys: main === null ? [] : slotKeysOf(main) };
  }
  if ('children' in node) {
    const keys = childLayerKeys(
      key,
      node.children.map((child) => child.name),
    );
    for (const [index, child] of node.children.entries()) {
      data.children.push(await readNode(child, keys[index] ?? '', node, childScope, context));
    }
  }
  return data;
}

/**
 * 노드에 연결된 컴포넌트 속성의 키를 읽는다.
 * @param node 노드
 * @returns 켜고 끄기·글자·인스턴스 교체 속성 키
 */
function propertyRefsOf(node: SceneNode): NodeData['propertyRefs'] {
  const refs = 'componentPropertyReferences' in node ? node.componentPropertyReferences : null;
  const result: NodeData['propertyRefs'] = {};
  if (refs?.visible !== undefined) {
    result.visible = refs.visible;
  }
  if (refs?.characters !== undefined) {
    result.characters = refs.characters;
  }
  if (refs?.mainComponent !== undefined) {
    result.mainComponent = refs.mainComponent;
  }
  return result;
}

/**
 * 컴포넌트(세트)의 `SLOT` 속성 키를 모은다.
 * @param node 컴포넌트 세트나 컴포넌트. 변형이면 그 세트를 본다
 * @returns `SLOT` 속성 키
 */
export function slotKeysOf(node: ComponentNode | ComponentSetNode): string[] {
  const owner =
    node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET' ? node.parent : node;
  return Object.entries(owner.componentPropertyDefinitions)
    .filter(([, definition]) => definition.type === 'SLOT')
    .map(([key]) => key);
}

/**
 * SLOT 노드가 어느 `SLOT` 속성인지 찾는다. 피그마 타입 정의에 슬롯 연결 필드가 없어,
 * `componentPropertyReferences`의 값 가운데 `SLOT` 속성 키인 것을 쓰고, 없으면 이름이 같은 `SLOT` 속성을 쓴다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param node SLOT 노드
 * @param slotKeys 이 자리 컴포넌트의 `SLOT` 속성 키
 * @returns 속성 키, 찾지 못하면 빈 문자열
 */
function slotPropertyOf(node: SceneNode, slotKeys: readonly string[]): string {
  const refs: unknown =
    'componentPropertyReferences' in node ? node.componentPropertyReferences : null;
  if (refs !== null && typeof refs === 'object') {
    for (const value of Object.values(refs)) {
      if (typeof value === 'string' && slotKeys.includes(value)) {
        return value;
      }
    }
  }
  const lower = node.name.trim().toLowerCase();
  const byName = slotKeys.filter(
    (slotKey) => (slotKey.split('#')[0] ?? '').toLowerCase() === lower,
  );
  return byName.length === 1 ? (byName[0] ?? '') : '';
}

/**
 * 인스턴스 안의 SLOT 노드가 원본 슬롯의 기본 내용과 다른 내용으로 채워졌는지 본다.
 * 기본 내용의 자식은 원본 슬롯 자식의 ID를 이어받으므로(`I<인스턴스>;<원본 ID>`) 자식 ID 목록을 견준다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param slot 인스턴스 안의 SLOT 노드
 * @param instanceId 슬롯을 품은 가장 가까운 인스턴스 ID
 * @returns 다른 내용으로 채웠으면 true
 */
async function isSlotFilled(slot: SlotNode, instanceId: string): Promise<boolean> {
  const sourceId = overrideSourceId(instanceId, slot.id);
  const source = sourceId === null ? null : await figma.getNodeByIdAsync(sourceId);
  if (source === null || !('children' in source)) {
    return true;
  }
  const own = slot.children.map((child) => overrideSourceId(instanceId, child.id));
  const original = source.children.map((child) => child.id);
  return own.length !== original.length || own.some((id, index) => id !== original[index]);
}

/**
 * 부모 안에서의 자기 배치를 읽는다.
 * @param node 노드
 * @returns 자기 배치
 */
function placementOf(node: SceneNode): PlacementData {
  return {
    positioning: 'layoutPositioning' in node ? node.layoutPositioning : 'AUTO',
    constraints:
      'constraints' in node
        ? { horizontal: node.constraints.horizontal, vertical: node.constraints.vertical }
        : { horizontal: 'MIN', vertical: 'MIN' },
    x: node.x,
    y: node.y,
  };
}

/**
 * 인스턴스의 원본, 배율, 속성 값, 원본과 값이 달라진 모양 덮어쓰기를 읽는다.
 * 덮어쓰기는 변형에 바로 놓인 인스턴스에서만 읽는다. 안쪽 인스턴스의 덮어쓰기는 그 원본 컴포넌트가 따로 검사받는다.
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:구조 검사]]
 * @param node 인스턴스
 * @param main 원본 컴포넌트
 * @param isOwn 변형에 바로 놓인 인스턴스인지(다른 인스턴스 안이 아님)
 * @param context 읽기 정보
 * @returns 인스턴스 정보
 */
async function instanceData(
  node: InstanceNode,
  main: ComponentNode | null,
  isOwn: boolean,
  context: ReadContext,
): Promise<InstanceData> {
  const owner = main?.parent?.type === 'COMPONENT_SET' ? main.parent : main;
  return {
    component: owner?.name ?? node.name,
    componentBehavior: owner === null ? null : await behaviorOf(owner, context),
    scaleFactor: node.scaleFactor,
    isExposed: node.isExposedInstance,
    properties: await instanceProperties(node, context),
    overrides: isOwn && main !== null ? await changedOverrides(node, main) : [],
  };
}

/**
 * 인스턴스의 속성 값을 읽는다. 속성 키의 `#id`는 떼고, 인스턴스 교체 값은 바꿔 끼운 원본의 참조로 옮긴다.
 * @codocs [[디자인 시스템:스키마]]
 * @param node 인스턴스
 * @param context 읽기 정보
 * @returns 속성 이름 → 값
 */
async function instanceProperties(
  node: InstanceNode,
  context: ReadContext,
): Promise<Record<string, PropertyValue>> {
  const result: Record<string, PropertyValue> = {};
  for (const [key, property] of Object.entries(node.componentProperties)) {
    const name = key.split('#')[0] ?? key;
    if (property.type === 'INSTANCE_SWAP') {
      const ref =
        typeof property.value === 'string' ? await componentRefById(property.value, context) : null;
      if (ref !== null) {
        result[name] = ref;
      }
    } else if (property.type !== 'SLOT') {
      result[name] = property.value;
    }
  }
  return result;
}

/**
 * 노드 ID로 원본 컴포넌트 참조를 만든다.
 * @param id 컴포넌트 노드 ID
 * @param context 읽기 정보
 * @returns 참조, 컴포넌트가 아니면 null
 */
export async function componentRefById(
  id: string,
  context: ReadContext,
): Promise<ComponentRef | null> {
  const node = await figma.getNodeByIdAsync(id);
  return node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET'
    ? componentRef(node, context)
    : null;
}

/**
 * 컴포넌트 노드를 참조로 옮긴다. 자산이면 자산 참조, 세트의 변형이면 세트 이름과 고른 변형의 축 값이다.
 * @codocs [[디자인 시스템:스키마]]
 * @param node 컴포넌트나 세트
 * @param context 읽기 정보
 * @returns 참조
 */
export function componentRef(
  node: ComponentNode | ComponentSetNode,
  context: ReadContext,
): ComponentRef {
  if (node.type === 'COMPONENT') {
    const asset = assetRefOf(node, context);
    if (asset !== null) {
      return { kind: 'asset', asset };
    }
    if (node.parent?.type === 'COMPONENT_SET') {
      return { kind: 'component', name: node.parent.name, values: variantValuesOf(node) };
    }
  }
  return { kind: 'component', name: node.name, values: {} };
}

/**
 * 원본 컴포넌트가 자산이면 자산 참조를 만든다. 묶음은 원본이 놓인 구역으로 정한다.
 * @codocs [[디자인 시스템:자산]]
 * @param main 원본 컴포넌트
 * @param context 읽기 정보
 * @returns 자산 참조, 자산이 아니면 null
 */
export function assetRefOf(main: ComponentNode, context: ReadContext): AssetRef | null {
  const cached = context.assets.get(main.id);
  if (cached !== undefined) {
    return cached;
  }
  const ancestors: string[] = [];
  let page = '';
  for (let current = main.parent; current !== null; current = current.parent) {
    if (current.type === 'PAGE') {
      page = current.name;
      break;
    }
    ancestors.unshift(current.name);
  }
  const group = assetGroupOf(page, ancestors);
  const ref =
    group === null ? null : { group, name: main.name, file: assetName({ group, name: main.name }) };
  context.assets.set(main.id, ref);
  return ref;
}

/**
 * 컴포넌트(세트)의 `Interaction` 분류 Dev Mode 주석에서 동작의 종류를 읽는다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @param node 컴포넌트 세트나 변형이 없는 컴포넌트
 * @param context 읽기 정보
 * @returns 종류 이름, 주석이 없으면 null
 */
export async function behaviorOf(
  node: ComponentNode | ComponentSetNode,
  context: ReadContext,
): Promise<string | null> {
  const cached = context.behaviors.get(node.id);
  if (cached !== undefined) {
    return cached;
  }
  let behavior: string | null = null;
  for (const annotation of node.annotations) {
    const text = (annotation.label ?? annotation.labelMarkdown ?? '').trim();
    if (
      text !== '' &&
      (await categoryName(annotation.categoryId, context)) === INTERACTION_CATEGORY
    ) {
      behavior = text;
      break;
    }
  }
  context.behaviors.set(node.id, behavior);
  return behavior;
}

/**
 * 주석 카테고리 이름을 찾는다. 피그마 화면 언어와 상관없이 영어 기준 이름으로 맞춘다.
 * @param id 카테고리 ID
 * @param context 읽기 정보
 * @returns 카테고리 이름, 없으면 null
 */
async function categoryName(id: string | undefined, context: ReadContext): Promise<string | null> {
  if (id === undefined || id === '') {
    return null;
  }
  if (!context.categories.has(id)) {
    const label = (await figma.annotations.getAnnotationCategoryByIdAsync(id))?.label;
    context.categories.set(id, label === undefined ? undefined : canonicalCategoryName(label));
  }
  return context.categories.get(id) ?? null;
}

/**
 * 원본 컴포넌트를 바꿔 끼운(변형 고르기·인스턴스 교체) 안쪽 인스턴스의 ID를 구한다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param node 바깥 인스턴스
 * @returns 바꿔 끼운 안쪽 인스턴스 ID 목록
 */
async function swappedInstanceIds(node: InstanceNode): Promise<string[]> {
  const result: string[] = [];
  for (const override of node.overrides) {
    const sourceId = override.id === node.id ? null : overrideSourceId(node.id, override.id);
    if (sourceId === null) {
      continue;
    }
    const [layer, source] = await Promise.all([
      figma.getNodeByIdAsync(override.id),
      figma.getNodeByIdAsync(sourceId),
    ]);
    if (layer?.type === 'INSTANCE' && source?.type === 'INSTANCE') {
      const [own, original] = await Promise.all([
        layer.getMainComponentAsync(),
        source.getMainComponentAsync(),
      ]);
      if (own !== null && original !== null && own.id !== original.id) {
        result.push(override.id);
      }
    }
  }
  return result;
}

/**
 * 인스턴스의 덮어쓰기 가운데 모양(칠·선·효과·불투명도와 그 스타일·변수 연결)이 원본과 값이 다른 것을 찾는다.
 * 덮어쓰기 기록만으로는 고르지 않는다(값이 같아도 기록이 남는다). 크기를 줄인 인스턴스는 인스턴스 자신만 본다.
 * 변형 고르기·인스턴스 교체로 원본이 바뀐 안쪽 인스턴스와 그 안쪽은 바꿔 끼운 새 원본과 견준다.
 * 견줄 원본을 찾지 못하면 고르지 않는다. 오탐으로 정상 작업을 막는 것보다 놓치는 쪽이 낫다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param node 변형에 바로 놓인 인스턴스
 * @param main 그 원본 컴포넌트
 * @returns 원본과 값이 다른 모양 덮어쓰기
 */
async function changedOverrides(node: InstanceNode, main: ComponentNode): Promise<OverrideData[]> {
  const isScaled = Math.abs(node.scaleFactor - 1) > EPSILON;
  const swappedIds = await swappedInstanceIds(node);
  const result: OverrideData[] = [];
  for (const override of node.overrides) {
    if (isScaled && override.id !== node.id) {
      continue;
    }
    // 피그마 타입 정의에는 없지만 변수 연결을 덮어쓰면 `boundVariables`도 온다.
    const overridden: readonly string[] = override.overriddenFields;
    const fields: string[] = overridden.filter((field) => appearanceFields.includes(field));
    const hasBindings = overridden.includes('boundVariables');
    if (fields.length === 0 && !hasBindings) {
      continue;
    }
    const pair = await comparedPair(node, main, override.id, swappedIds);
    if (pair === null) {
      continue;
    }
    const [layer, source] = pair;
    const changed = fields.filter(
      (field) =>
        JSON.stringify(Reflect.get(layer, field) ?? null) !==
        JSON.stringify(Reflect.get(source, field) ?? null),
    );
    if (hasBindings) {
      const own: Record<string, unknown> =
        'boundVariables' in layer ? (layer.boundVariables ?? {}) : {};
      const original: Record<string, unknown> =
        'boundVariables' in source ? (source.boundVariables ?? {}) : {};
      for (const field of appearanceBindings) {
        if (JSON.stringify(own[field] ?? null) !== JSON.stringify(original[field] ?? null)) {
          changed.push(`boundVariables.${field}`);
        }
      }
    }
    if (changed.length > 0) {
      result.push({ id: override.id, fields: [...new Set(changed)].sort() });
    }
  }
  return result;
}

/**
 * 덮어쓴 레이어와 견줄 원본 레이어를 찾는다.
 * @param node 덮어쓰기를 가진 인스턴스
 * @param main 그 원본 컴포넌트
 * @param layerId 덮어쓴 레이어 ID
 * @param swappedIds 원본 컴포넌트를 바꾼 덮어쓰기 레이어 ID들
 * @returns 덮어쓴 레이어와 원본 레이어. 어느 한쪽을 찾지 못하면 null
 */
async function comparedPair(
  node: InstanceNode,
  main: ComponentNode,
  layerId: string,
  swappedIds: readonly string[],
): Promise<[BaseNode, BaseNode] | null> {
  const base = bindingBase(node.id, layerId, swappedIds);
  let baseMainId = main.id;
  let sourceId: string | null = layerId === node.id ? null : overrideSourceId(node.id, layerId);
  if (base.kind === 'swapped') {
    const swapped = await figma.getNodeByIdAsync(base.swappedId);
    const swappedMain = swapped?.type === 'INSTANCE' ? await swapped.getMainComponentAsync() : null;
    if (swappedMain === null) {
      return null;
    }
    baseMainId = swappedMain.id;
    sourceId = base.sourceId;
  } else if (layerId !== node.id && sourceId === null) {
    return null;
  }
  const [layer, source] = await Promise.all([
    figma.getNodeByIdAsync(layerId),
    figma.getNodeByIdAsync(sourceId ?? baseMainId),
  ]);
  return layer === null || source === null ? null : [layer, source];
}

/**
 * 노드의 변수 연결을 읽는다. 인스턴스 교체 속성으로 바꿔 끼운 인스턴스는 바꾸기 전 레이어의 연결을 물려받는다.
 * @codocs [[디자인 시스템:스키마]]
 * @param node 노드
 * @param context 읽기 정보
 * @returns 필드 이름 → 변수 참조
 */
async function boundVariables(
  node: SceneNode,
  context: ReadContext,
): Promise<Partial<Record<string, VariableRef>>> {
  let bindings = bindingIds(node);
  const sourceId =
    node.type === 'INSTANCE' && node.componentPropertyReferences?.mainComponent !== undefined
      ? sourceLayerId(node.id)
      : null;
  const source = sourceId === null ? null : await figma.getNodeByIdAsync(sourceId);
  if (source !== null && source.type === 'INSTANCE') {
    bindings = inheritedBindings(bindings, bindingIds(source), (field) =>
      isSameNumber(node, source, field),
    );
  }
  const result: Partial<Record<string, VariableRef>> = {};
  for (const [field, id] of Object.entries(bindings)) {
    if (id !== undefined) {
      const ref = await variableRef({ id }, context);
      if (ref !== undefined) {
        result[field] = ref;
      }
    }
  }
  return result;
}

/**
 * 두 노드의 숫자 필드 값이 같은지 확인한다.
 * @param node 노드
 * @param source 비교할 노드
 * @param field 필드 이름
 * @returns 둘 다 숫자이고 같으면 true
 */
function isSameNumber(node: SceneNode, source: SceneNode, field: string): boolean {
  const value: unknown = Reflect.get(node, field);
  const original: unknown = Reflect.get(source, field);
  return (
    typeof value === 'number' &&
    typeof original === 'number' &&
    Math.abs(value - original) < EPSILON
  );
}

/**
 * 노드 자신에 연결된 변수 ID를 필드마다 읽는다(칠·선처럼 목록인 필드는 뺀다).
 * @param node 노드
 * @returns 필드 이름 → 변수 ID
 */
function bindingIds(node: SceneNode): Bindings {
  const result: Bindings = {};
  for (const [field, value] of Object.entries(node.boundVariables ?? {})) {
    const id: unknown = typeof value === 'object' ? Reflect.get(value, 'id') : undefined;
    if (typeof id === 'string') {
      result[field] = id;
    }
  }
  return result;
}

/**
 * 잠긴 비율을 읽는다.
 * @param node 노드
 * @returns 너비 ÷ 높이, 잠기지 않았으면 null
 */
function aspectRatioOf(node: SceneNode): number | null {
  if (!('targetAspectRatio' in node) || node.targetAspectRatio === null) {
    return null;
  }
  const { x, y } = node.targetAspectRatio;
  return y === 0 ? null : x / y;
}

/**
 * 부모의 자동 배치 방향을 읽는다.
 * @param parent 부모
 * @returns 방향, 자동 배치가 아니면 null
 */
function parentLayoutMode(parent: (BaseNode & ChildrenMixin) | null): string | null {
  if (parent === null || !('layoutMode' in parent) || parent.layoutMode === 'NONE') {
    return null;
  }
  return parent.layoutMode;
}

/**
 * 값이 있을 때만 변수 연결과 함께 읽는다.
 * @param value 값(없으면 null)
 * @param variable 변수 참조
 * @returns 값과 변수, 값이 없으면 null
 */
function optionalBound(value: number | null, variable: VariableRef | undefined): Bound | null {
  return value === null ? null : { value, variable };
}

/**
 * 칠·선 목록을 읽는다. 숨긴 칠도 읽고 isVisible로 나눈다.
 * @param paints 피그마 칠
 * @param context 읽기 정보
 * @returns 칠 데이터
 */
async function paintsData(paints: readonly Paint[], context: ReadContext): Promise<PaintData[]> {
  const result: PaintData[] = [];
  for (const paint of paints) {
    const data: PaintData = {
      type: paint.type,
      isVisible: paint.visible ?? true,
      blendMode: paint.blendMode ?? 'NORMAL',
      opacity: paint.opacity ?? 1,
    };
    if (paint.type === 'SOLID') {
      data.color = { r: paint.color.r, g: paint.color.g, b: paint.color.b };
      data.variable = await variableRef(paint.boundVariables?.color, context);
    } else if (paint.type === 'IMAGE') {
      data.imageHash = paint.imageHash;
      data.scaleMode = paint.scaleMode;
      data.imageAsset =
        paint.imageHash === null ? null : (context.imageAssets.get(paint.imageHash) ?? null);
    } else if ('gradientStops' in paint) {
      data.gradientStops = paint.gradientStops.map((stop) => ({
        position: stop.position,
        color: { r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a },
      }));
    }
    result.push(data);
  }
  return result;
}

/**
 * 변마다 선 두께와 변수 연결을 읽는다.
 * @param node 선이 있는 노드
 * @param bound 노드 변수 연결
 * @returns 변마다 두께
 */
function strokeWeights(
  node: SceneNode & MinimalStrokesMixin,
  bound: Partial<Record<string, VariableRef>>,
): Sides<Bound> {
  /**
   * 한 변의 두께를 읽는다.
   * @param value 두께
   * @param field 변수 필드 이름
   * @returns 두께와 변수
   */
  function side(value: number, field: string): Bound {
    return { value, variable: bound[field] ?? bound.strokeWeight };
  }
  if ('strokeTopWeight' in node) {
    return {
      top: side(node.strokeTopWeight, 'strokeTopWeight'),
      right: side(node.strokeRightWeight, 'strokeRightWeight'),
      bottom: side(node.strokeBottomWeight, 'strokeBottomWeight'),
      left: side(node.strokeLeftWeight, 'strokeLeftWeight'),
    };
  }
  const weight = node.strokeWeight === figma.mixed ? 0 : node.strokeWeight;
  const all = side(weight, 'strokeWeight');
  return { top: all, right: all, bottom: all, left: all };
}

/**
 * 모서리마다 반경과 변수 연결을 읽는다.
 * @param node 반경이 있는 노드
 * @param bound 노드 변수 연결
 * @returns 모서리마다 반경
 */
function corners(
  node: SceneNode & { cornerRadius?: number | PluginAPI['mixed'] },
  bound: Partial<Record<string, VariableRef>>,
): Corners<Bound> {
  /**
   * 한 모서리의 반경을 읽는다.
   * @param value 반경
   * @param field 변수 필드 이름
   * @returns 반경과 변수
   */
  function corner(value: number, field: string): Bound {
    return { value, variable: bound[field] ?? bound.cornerRadius };
  }
  if ('topLeftRadius' in node) {
    return {
      topLeft: corner(node.topLeftRadius, 'topLeftRadius'),
      topRight: corner(node.topRightRadius, 'topRightRadius'),
      bottomRight: corner(node.bottomRightRadius, 'bottomRightRadius'),
      bottomLeft: corner(node.bottomLeftRadius, 'bottomLeftRadius'),
    };
  }
  const radius = typeof node.cornerRadius === 'number' ? node.cornerRadius : 0;
  const all = corner(radius, 'cornerRadius');
  return { topLeft: all, topRight: all, bottomRight: all, bottomLeft: all };
}

/**
 * 효과 하나를 읽는다. 그림자는 피그마가 돌려준 최종 값(효과 스타일을 푼 값)을 함께 담는다.
 * @param effect 피그마 효과
 * @returns 효과 데이터
 */
function effectData(effect: Effect): EffectData {
  const data: EffectData = {
    type: effect.type,
    isVisible: effect.visible,
    blendMode: 'blendMode' in effect ? effect.blendMode : 'NORMAL',
  };
  if ('blurType' in effect) {
    data.blurType = effect.blurType;
  }
  if ('showShadowBehindNode' in effect) {
    data.isShadowShownBehindNode = effect.showShadowBehindNode;
  }
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    data.shadow = {
      color: { r: effect.color.r, g: effect.color.g, b: effect.color.b, a: effect.color.a },
      offsetX: effect.offset.x,
      offsetY: effect.offset.y,
      radius: effect.radius,
      spread: effect.spread ?? 0,
    };
  }
  return data;
}

/**
 * 자동 배치 값을 읽는다. 자동 배치가 아니면(`NONE`, `GRID`) null이다.
 * @param node 프레임 계열 노드
 * @param bound 노드 변수 연결
 * @returns 자동 배치 데이터
 */
function layoutData(
  node: SceneNode & BaseFrameMixin,
  bound: Partial<Record<string, VariableRef>>,
): LayoutData | null {
  const mode = node.layoutMode;
  if (mode !== 'HORIZONTAL' && mode !== 'VERTICAL') {
    return null;
  }
  /**
   * 값과 변수 연결을 함께 읽는다.
   * @param value 값
   * @param field 변수 필드 이름
   * @returns 값과 변수
   */
  function valueOf(value: number, field: string): Bound {
    return { value, variable: bound[field] };
  }
  return {
    mode,
    wrap: node.layoutWrap,
    primaryAlign: node.primaryAxisAlignItems,
    counterAlign: node.counterAxisAlignItems,
    counterAlignContent: node.counterAxisAlignContent,
    padding: {
      top: valueOf(node.paddingTop, 'paddingTop'),
      right: valueOf(node.paddingRight, 'paddingRight'),
      bottom: valueOf(node.paddingBottom, 'paddingBottom'),
      left: valueOf(node.paddingLeft, 'paddingLeft'),
    },
    itemSpacing: valueOf(node.itemSpacing, 'itemSpacing'),
    counterAxisSpacing:
      node.counterAxisSpacing === null
        ? null
        : valueOf(node.counterAxisSpacing, 'counterAxisSpacing'),
    isReversingZIndex: node.itemReverseZIndex,
  };
}

/**
 * 글자와 서식 구간을 읽는다.
 * @param node 글자 노드
 * @param context 읽기 정보
 * @returns 글자 데이터
 */
async function textData(node: TextNode, context: ReadContext): Promise<TextData> {
  await loadFonts(node);
  const segments: TextSegmentData[] = [];
  for (const segment of node.getStyledTextSegments([
    'fontName',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'textStyleId',
    'fills',
    'fillStyleId',
    'openTypeFeatures',
    'textStyleOverrides',
  ])) {
    segments.push({
      characters: segment.characters,
      fontFamily: segment.fontName.family,
      textStyle: await styleName(segment.textStyleId, context),
      overrides: segment.textStyleOverrides.map((override) => override.type),
      fills: await paintsData(segment.fills, context),
      fillStyle: await styleName(segment.fillStyleId, context),
      hasOpenTypeFeatures: Object.values(segment.openTypeFeatures).some(Boolean),
      fontSize: segment.fontSize,
      fontWeight: segment.fontWeight,
      lineHeight: segment.lineHeight,
    });
  }
  return {
    characters: node.characters,
    autoResize: node.textAutoResize,
    hasMissingFont: node.hasMissingFont,
    truncation: node.textTruncation,
    maxLines: node.maxLines,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    segments,
  };
}

/**
 * Foundations 자산 컴포넌트의 인스턴스인지 확인하고 이름·묶음·색·맞춤 방식을 읽는다.
 * 안쪽 모양은 비교하지 않는다(자산 파일이 정한다).
 * @codocs [[디자인 시스템:자산]]
 * @param node 인스턴스
 * @param main 원본 컴포넌트
 * @param context 읽기 정보
 * @returns 자산 데이터, 자산이 아니면 null
 */
async function assetData(
  node: InstanceNode,
  main: ComponentNode,
  context: ReadContext,
): Promise<AssetData | null> {
  const ref = assetRefOf(main, context);
  if (ref === null) {
    return null;
  }
  const kind = assetKinds[ref.group];
  const problems: string[] = [];
  const colors = new Map<string, Bound<Rgb>>();
  if (kind === 'mono') {
    for (const shape of node.findAll(() => true)) {
      if (!shape.visible) {
        continue;
      }
      for (const [label, paints] of [
        ['칠', 'fills' in shape && shape.fills !== figma.mixed ? shape.fills : []],
        ['선', 'strokes' in shape ? shape.strokes : []],
      ] as const) {
        for (const paint of paints) {
          if (paint.visible === false) {
            continue;
          }
          if (paint.type !== 'SOLID') {
            problems.push(`${shape.name}의 ${label}이 단색이 아니다`);
            continue;
          }
          const color: Bound<Rgb> = {
            value: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
            variable: await variableRef(paint.boundVariables?.color, context),
          };
          colors.set(JSON.stringify(color.variable ?? color.value), color);
        }
      }
    }
    const [only] = colors.values();
    if (colors.size > 1) {
      problems.push('한 가지 색 자산인데 색이 여럿이다');
    } else if (only?.variable === undefined) {
      problems.push('한 가지 색 자산의 색이 색 변수에 연결되어 있지 않다');
    }
  }
  const [color] = colors.values();
  const imageFill =
    node.fills === figma.mixed
      ? undefined
      : node.fills.find((fill) => fill.type === 'IMAGE' && fill.visible !== false);
  return {
    name: main.name,
    mainComponentId: main.id,
    group: ref.group,
    file: ref.file,
    kind,
    sourceWidth: main.width,
    sourceHeight: main.height,
    color: colors.size === 1 && color !== undefined ? color : null,
    measuredColor: color?.value ?? null,
    scaleMode: imageFill?.type === 'IMAGE' ? imageFill.scaleMode : null,
    problems,
  };
}

/**
 * 변수 별칭의 변수 참조(컬렉션 이름과 변수 이름)를 찾는다.
 * @param alias 변수 별칭
 * @param context 읽기 정보
 * @returns 변수 참조, 없으면 undefined
 */
export async function variableRef(
  alias: { id: string } | undefined,
  context: ReadContext,
): Promise<VariableRef | undefined> {
  if (alias === undefined) {
    return undefined;
  }
  if (!context.variables.has(alias.id)) {
    const variable = await figma.variables.getVariableByIdAsync(alias.id);
    const collection =
      variable === null
        ? null
        : await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    context.variables.set(
      alias.id,
      variable === null ? undefined : { collection: collection?.name ?? '', name: variable.name },
    );
  }
  return context.variables.get(alias.id);
}

/**
 * 스타일 ID의 스타일 이름을 찾는다.
 * @param id 스타일 ID(없거나 섞여 있으면 빈 문자열이나 mixed)
 * @param context 읽기 정보
 * @returns 스타일 이름, 없으면 undefined
 */
export async function styleName(
  id: string | symbol,
  context: ReadContext,
): Promise<string | undefined> {
  if (typeof id !== 'string' || id === '') {
    return undefined;
  }
  if (!context.styles.has(id)) {
    context.styles.set(id, (await figma.getStyleByIdAsync(id))?.name);
  }
  return context.styles.get(id);
}

/**
 * 글자 노드가 쓰는 글꼴을 불러온다. 불러오기 전에는 설치된 글꼴도 hasMissingFont가 true로 읽힐 때가 있다.
 * 불러올 수 없는 글꼴은 그대로 두어 hasMissingFont가 알리게 한다.
 * @param node 글자 노드
 */
async function loadFonts(node: TextNode): Promise<void> {
  for (const segment of node.getStyledTextSegments(['fontName'])) {
    try {
      await figma.loadFontAsync(segment.fontName);
    } catch {
      // 없는 글꼴은 hasMissingFont로 막는다.
    }
  }
}
