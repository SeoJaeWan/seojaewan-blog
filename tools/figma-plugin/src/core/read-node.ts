import { ASSET_GROUP_PREFIX, ASSET_GROUPS } from './asset-groups';
import {
  bindingBase,
  type Bindings,
  inheritedBindings,
  overrideSourceId,
  sourceLayerId,
} from './bindings';
import type {
  AssetData,
  AssetKind,
  Bound,
  ChildLayoutData,
  Corners,
  EffectData,
  InstanceData,
  LayoutData,
  NodeData,
  OverrideData,
  PaintData,
  Sides,
  TextData,
  TextSegmentData,
} from './node-data';

// 피그마 노드를 node-data.ts의 순수 데이터로 읽는다. 변수·스타일은 이름으로 바꿔 둔다.
// 플러그인과 피그마 MCP(use_figma) 양쪽에서 같은 코드가 실행된다. 노드를 바꾸지 않는다(읽기 전용).

/** 변수·스타일 ID → 이름 캐시 */
export type NameCache = Map<string, string | undefined>;

// 호 각도와 크기 비교에 쓰는 소수 오차다.
const EPSILON = 1e-6;

/**
 * 변형 루트와 그 아래 보이는 노드를 읽는다. 숨긴 노드는 그리지 않으므로 읽지 않는다.
 * 슬롯은 안쪽(조립이 채운 내용)까지 읽는다. 자산 인스턴스(Foundations 자산 묶음의 컴포넌트)는 안쪽을 읽지 않고
 * 이름·묶음·색만 읽는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 변형 루트
 * @param names 변수·스타일 이름 캐시
 * @returns 노드 데이터
 */
export async function readNodeTree(
  node: SceneNode,
  names: NameCache = new Map(),
): Promise<NodeData> {
  return readNode(node, '', null, names);
}

/**
 * 노드 하나와 그 아래를 읽는다.
 * @param node 노드
 * @param path 레이어 경로
 * @param parent 부모 노드(루트면 null)
 * @param names 이름 캐시
 * @returns 노드 데이터
 */
async function readNode(
  node: SceneNode,
  path: string,
  parent: (BaseNode & ChildrenMixin) | null,
  names: NameCache,
): Promise<NodeData> {
  const bound = await boundVariables(node);
  const data: NodeData = {
    id: node.id,
    name: node.name,
    type: node.type,
    path,
    parentLayoutMode: parentLayoutMode(parent),
    opacity: {
      value: 'opacity' in node ? node.opacity : 1,
      variable: await variableName(bound.opacity, names),
    },
    rotation: 'rotation' in node ? node.rotation : 0,
    isMask: 'isMask' in node ? node.isMask : false,
    width: { value: node.width, variable: await variableName(bound.width, names) },
    height: { value: node.height, variable: await variableName(bound.height, names) },
    minWidth: await optionalBound('minWidth' in node ? node.minWidth : null, bound.minWidth, names),
    maxWidth: await optionalBound('maxWidth' in node ? node.maxWidth : null, bound.maxWidth, names),
    minHeight: await optionalBound(
      'minHeight' in node ? node.minHeight : null,
      bound.minHeight,
      names,
    ),
    maxHeight: await optionalBound(
      'maxHeight' in node ? node.maxHeight : null,
      bound.maxHeight,
      names,
    ),
    fills: null,
    strokes: null,
    dashPattern: 'dashPattern' in node ? node.dashPattern : [],
    variableWidthStroke: false,
    complexStroke: false,
    cornerSmoothing: 'cornerSmoothing' in node ? node.cornerSmoothing : 0,
    effects: null,
    layout: null,
    child: null,
    text: null,
    asset: null,
    instance: null,
    isFullEllipse: node.type === 'ELLIPSE' ? isFullEllipse(node) : null,
    children: [],
  };

  if ('fills' in node) {
    data.fills = node.fills === figma.mixed ? 'mixed' : await paintsData(node.fills, names);
    data.fillStyle = await styleName('fillStyleId' in node ? node.fillStyleId : '', names);
  }
  if ('strokes' in node) {
    data.strokes = await paintsData(node.strokes, names);
    data.strokeStyle = await styleName(node.strokeStyleId, names);
    data.strokeWeight = await strokeWeights(node, bound, names);
    if ('variableWidthStrokeProperties' in node) {
      const profile = node.variableWidthStrokeProperties;
      data.variableWidthStroke = profile !== null && profile.widthProfile !== 'UNIFORM';
    }
    if ('complexStrokeProperties' in node) {
      data.complexStroke = node.complexStrokeProperties.type !== 'BASIC';
    }
  }
  if ('cornerRadius' in node) {
    data.radius = await corners(node, bound, names);
  }
  if ('effects' in node) {
    data.effects = node.effects.map(effectData);
    data.effectStyle = await styleName(node.effectStyleId, names);
  }
  if ('layoutMode' in node) {
    data.layout = await layoutData(node, bound, names);
  }
  if (parent !== null) {
    data.child = childLayout(node);
  }
  if (node.type === 'TEXT') {
    data.text = await textData(node, names);
  }
  if (node.type === 'INSTANCE') {
    data.instance = await instanceData(node);
    const asset = await assetData(node, names);
    if (asset !== null) {
      data.asset = asset;
      return data;
    }
  }
  if ('children' in node) {
    for (const child of node.children) {
      if (child.visible) {
        const childPath = path === '' ? child.name : `${path}/${child.name}`;
        data.children.push(await readNode(child, childPath, node, names));
      }
    }
  }
  return data;
}

/**
 * 인스턴스의 원본 컴포넌트 이름, 배율, 직접 덮어쓴 필드(`InstanceNode.overrides`)를 읽는다.
 * `boundVariables`를 덮어쓴 레이어는 원본 컴포넌트 안 같은 레이어와 변수 연결을 비교해 어느 필드가 바뀌었는지 적는다.
 * 피그마는 `boundVariables` 하나로만 알려 주기 때문이다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 인스턴스
 * @returns 인스턴스 정보
 */
async function instanceData(node: InstanceNode): Promise<InstanceData> {
  const main = await node.getMainComponentAsync();
  const component =
    main === null
      ? node.name
      : main.parent?.type === 'COMPONENT_SET'
        ? main.parent.name
        : main.name;
  const overrides: OverrideData[] = [];
  const swappedIds = await swappedInstanceIds(node);
  for (const override of node.overrides) {
    const fields: string[] = [...override.overriddenFields];
    let changedBindings: string[] = [];
    if (fields.includes('boundVariables') && main !== null) {
      changedBindings = await changedBindingsOf(node, main, override.id, swappedIds);
    }
    overrides.push({ id: override.id, fields, changedBindings });
  }
  return { component, scaleFactor: node.scaleFactor, overrides };
}

/**
 * 원본 컴포넌트를 바꿔 끼운(변형 고르기·인스턴스 교체) 안쪽 인스턴스의 ID를 구한다.
 * 덮어쓴 인스턴스 레이어의 원본 컴포넌트를 원래 자리(바깥 인스턴스의 원본 컴포넌트 안 같은 위치)의 원본과 비교한다.
 * @codocs [[피그마 연동:구조 검사]]
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
 * 덮어쓴 레이어의 변수 연결이 바뀐 필드를 구한다.
 * 변형 고르기·인스턴스 교체로 원본 컴포넌트가 바뀐 안쪽 인스턴스와 그 안쪽 레이어는 원래 자리의 원본이 아니라
 * 바꿔 끼운 새 원본 컴포넌트와 비교한다. 원래 자리와 비교하면 원본이 속성으로 연 변형 고르기가 직접 덮어쓴 것으로 잡힌다.
 * 기준을 구할 수 없으면 비교하지 않는다. 오탐으로 정상 작업을 막는 것보다 놓치는 쪽이 낫다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 덮어쓰기를 가진 바깥 인스턴스
 * @param main 바깥 인스턴스의 원본 컴포넌트
 * @param layerId 덮어쓴 레이어 ID
 * @param swappedIds 원본 컴포넌트를 바꾼 덮어쓰기 레이어 ID들
 * @returns 연결이 다른 필드 이름
 */
async function changedBindingsOf(
  node: InstanceNode,
  main: ComponentNode,
  layerId: string,
  swappedIds: readonly string[],
): Promise<string[]> {
  const base = bindingBase(node.id, layerId, swappedIds);
  let baseMainId = main.id;
  let sourceId: string | null = layerId === node.id ? null : overrideSourceId(node.id, layerId);
  if (base.kind === 'swapped') {
    const swapped = await figma.getNodeByIdAsync(base.swappedId);
    const swappedMain =
      swapped !== null && swapped.type === 'INSTANCE'
        ? await swapped.getMainComponentAsync()
        : null;
    if (swappedMain === null) {
      return [];
    }
    baseMainId = swappedMain.id;
    sourceId = base.sourceId;
  } else if (layerId !== node.id && sourceId === null) {
    return [];
  }
  const [layer, source] = await Promise.all([
    figma.getNodeByIdAsync(layerId),
    figma.getNodeByIdAsync(sourceId ?? baseMainId),
  ]);
  return differentBindings(layer, source);
}

/**
 * 두 레이어의 변수 연결을 필드마다 비교한다.
 * @param layer 덮어쓴 레이어
 * @param source 원본 컴포넌트 안 같은 레이어
 * @returns 연결이 다른 필드 이름. 어느 한쪽을 찾지 못하면 빈 목록
 */
function differentBindings(layer: BaseNode | null, source: BaseNode | null): string[] {
  if (layer === null || source === null || !('boundVariables' in layer)) {
    return [];
  }
  const own: Record<string, unknown> = layer.boundVariables ?? {};
  const original: Record<string, unknown> =
    'boundVariables' in source ? (source.boundVariables ?? {}) : {};
  const fields = new Set([...Object.keys(own), ...Object.keys(original)]);
  return [...fields].filter(
    (field) => JSON.stringify(own[field] ?? null) !== JSON.stringify(original[field] ?? null),
  );
}

/**
 * 노드의 변수 연결 표를 읽는다. 인스턴스 교체 속성으로 바꿔 끼운 인스턴스는 바꾸기 전 레이어의 연결을 물려받는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 노드
 * @returns 필드 이름 → 변수 별칭
 */
async function boundVariables(node: SceneNode): Promise<Partial<Record<string, VariableAlias>>> {
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
  const result: Partial<Record<string, VariableAlias>> = {};
  for (const [field, id] of Object.entries(bindings)) {
    if (id !== undefined) {
      result[field] = { type: 'VARIABLE_ALIAS', id };
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
 * ELLIPSE가 호가 아닌 완전한 원(또는 타원)인지 확인한다.
 * @param node 타원 노드
 * @returns 완전하면 true
 */
function isFullEllipse(node: EllipseNode): boolean {
  const { startingAngle, endingAngle, innerRadius } = node.arcData;
  return (
    innerRadius === 0 && Math.abs(Math.abs(endingAngle - startingAngle) - 2 * Math.PI) < EPSILON
  );
}

/**
 * 값이 있을 때만 변수 연결과 함께 읽는다.
 * @param value 값(없으면 null)
 * @param alias 변수 별칭
 * @param names 이름 캐시
 * @returns 값과 변수, 값이 없으면 null
 */
async function optionalBound(
  value: number | null,
  alias: VariableAlias | undefined,
  names: NameCache,
): Promise<Bound | null> {
  if (value === null) {
    return null;
  }
  return { value, variable: await variableName(alias, names) };
}

/**
 * 칠·선 목록을 읽는다.
 * @param paints 피그마 칠
 * @param names 이름 캐시
 * @returns 칠 데이터
 */
async function paintsData(paints: readonly Paint[], names: NameCache): Promise<PaintData[]> {
  const result: PaintData[] = [];
  for (const paint of paints) {
    result.push({
      type: paint.type,
      visible: paint.visible ?? true,
      blendMode: paint.blendMode ?? 'NORMAL',
      variable:
        paint.type === 'SOLID' ? await variableName(paint.boundVariables?.color, names) : undefined,
      imageHash: paint.type === 'IMAGE' ? paint.imageHash : undefined,
    });
  }
  return result;
}

/**
 * 변마다 선 두께와 변수 연결을 읽는다.
 * @param node 선이 있는 노드
 * @param bound 노드 변수 연결
 * @param names 이름 캐시
 * @returns 변마다 두께
 */
async function strokeWeights(
  node: SceneNode & MinimalStrokesMixin,
  bound: Partial<Record<string, VariableAlias>>,
  names: NameCache,
): Promise<Sides<Bound>> {
  /**
   * 한 변의 두께를 읽는다.
   * @param value 두께
   * @param field 변수 필드 이름
   * @returns 두께와 변수
   */
  async function side(value: number, field: string): Promise<Bound> {
    return { value, variable: await variableName(bound[field] ?? bound.strokeWeight, names) };
  }
  if ('strokeTopWeight' in node) {
    return {
      top: await side(node.strokeTopWeight, 'strokeTopWeight'),
      right: await side(node.strokeRightWeight, 'strokeRightWeight'),
      bottom: await side(node.strokeBottomWeight, 'strokeBottomWeight'),
      left: await side(node.strokeLeftWeight, 'strokeLeftWeight'),
    };
  }
  const weight = node.strokeWeight === figma.mixed ? 0 : node.strokeWeight;
  const all = await side(weight, 'strokeWeight');
  return { top: all, right: all, bottom: all, left: all };
}

/**
 * 모서리마다 반경과 변수 연결을 읽는다.
 * @param node 반경이 있는 노드
 * @param bound 노드 변수 연결
 * @param names 이름 캐시
 * @returns 모서리마다 반경
 */
async function corners(
  node: SceneNode & { cornerRadius?: number | PluginAPI['mixed'] },
  bound: Partial<Record<string, VariableAlias>>,
  names: NameCache,
): Promise<Corners<Bound>> {
  /**
   * 한 모서리의 반경을 읽는다.
   * @param value 반경
   * @param field 변수 필드 이름
   * @returns 반경과 변수
   */
  async function corner(value: number, field: string): Promise<Bound> {
    return { value, variable: await variableName(bound[field] ?? bound.cornerRadius, names) };
  }
  if ('topLeftRadius' in node) {
    return {
      topLeft: await corner(node.topLeftRadius, 'topLeftRadius'),
      topRight: await corner(node.topRightRadius, 'topRightRadius'),
      bottomRight: await corner(node.bottomRightRadius, 'bottomRightRadius'),
      bottomLeft: await corner(node.bottomLeftRadius, 'bottomLeftRadius'),
    };
  }
  const radius = typeof node.cornerRadius === 'number' ? node.cornerRadius : 0;
  const all = await corner(radius, 'cornerRadius');
  return { topLeft: all, topRight: all, bottomRight: all, bottomLeft: all };
}

/**
 * 효과 하나를 읽는다.
 * @param effect 피그마 효과
 * @returns 효과 데이터
 */
function effectData(effect: Effect): EffectData {
  const data: EffectData = {
    type: effect.type,
    visible: effect.visible,
    blendMode: 'blendMode' in effect ? effect.blendMode : 'NORMAL',
  };
  if ('blurType' in effect) {
    data.blurType = effect.blurType;
  }
  if ('showShadowBehindNode' in effect) {
    data.showShadowBehindNode = effect.showShadowBehindNode;
  }
  return data;
}

/**
 * 자동 배치 값을 읽는다.
 * @param node 프레임 계열 노드
 * @param bound 노드 변수 연결
 * @param names 이름 캐시
 * @returns 자동 배치 데이터
 */
async function layoutData(
  node: SceneNode & BaseFrameMixin,
  bound: Partial<Record<string, VariableAlias>>,
  names: NameCache,
): Promise<LayoutData> {
  /**
   * 값과 변수 연결을 함께 읽는다.
   * @param valueOf 값
   * @param field 변수 필드 이름
   * @returns 값과 변수
   */
  async function value(valueOf: number, field: string): Promise<Bound> {
    return { value: valueOf, variable: await variableName(bound[field], names) };
  }
  return {
    mode: node.layoutMode,
    wrap: node.layoutWrap,
    primaryAlign: node.primaryAxisAlignItems,
    primarySizing: node.primaryAxisSizingMode,
    counterSizing: node.counterAxisSizingMode,
    padding: {
      top: await value(node.paddingTop, 'paddingTop'),
      right: await value(node.paddingRight, 'paddingRight'),
      bottom: await value(node.paddingBottom, 'paddingBottom'),
      left: await value(node.paddingLeft, 'paddingLeft'),
    },
    itemSpacing: await value(node.itemSpacing, 'itemSpacing'),
    counterAxisSpacing:
      node.counterAxisSpacing === null
        ? null
        : await value(node.counterAxisSpacing, 'counterAxisSpacing'),
  };
}

/**
 * 부모 안에서의 자기 배치를 읽는다.
 * @param node 노드
 * @returns 자기 배치 데이터
 */
function childLayout(node: SceneNode): ChildLayoutData {
  const hasLayoutChild = 'layoutSizingHorizontal' in node;
  return {
    sizingHorizontal: hasLayoutChild ? node.layoutSizingHorizontal : 'FIXED',
    sizingVertical: hasLayoutChild ? node.layoutSizingVertical : 'FIXED',
    positioning: 'layoutPositioning' in node ? node.layoutPositioning : 'AUTO',
    constraints:
      'constraints' in node
        ? { horizontal: node.constraints.horizontal, vertical: node.constraints.vertical }
        : { horizontal: 'MIN', vertical: 'MIN' },
  };
}

/**
 * 글자와 서식 구간을 읽는다.
 * @param node 글자 노드
 * @param names 이름 캐시
 * @returns 글자 데이터
 */
async function textData(node: TextNode, names: NameCache): Promise<TextData> {
  await loadFonts(node);
  const segments: TextSegmentData[] = [];
  for (const segment of node.getStyledTextSegments([
    'fontName',
    'textStyleId',
    'fills',
    'fillStyleId',
    'openTypeFeatures',
    'textStyleOverrides',
  ])) {
    segments.push({
      characters: segment.characters,
      fontFamily: segment.fontName.family,
      textStyle: await styleName(segment.textStyleId, names),
      overrides: segment.textStyleOverrides.map((override) => override.type),
      fills: await paintsData(segment.fills, names),
      fillStyle: await styleName(segment.fillStyleId, names),
      hasOpenTypeFeatures: Object.values(segment.openTypeFeatures).some(Boolean),
    });
  }
  return { autoResize: node.textAutoResize, hasMissingFont: node.hasMissingFont, segments };
}

/**
 * Foundations 자산 컴포넌트의 인스턴스인지 확인하고 이름·묶음·색을 읽는다.
 * 원본 컴포넌트를 담은 프레임 중 자산 묶음(`group/Icons`, `group/Shapes`, `group/Illustrations`, `group/Images`)이 있으면 자산이고,
 * 그 묶음이 처리 방식을 정한다. 안쪽 모양은 비교하지 않는다(자산 파일이 생성 사슬로 보장한다).
 * @param node 인스턴스
 * @param names 이름 캐시
 * @returns 자산 데이터, 자산이 아니면 null
 */
async function assetData(node: InstanceNode, names: NameCache): Promise<AssetData | null> {
  const main = await node.getMainComponentAsync();
  if (main === null) {
    return null;
  }
  const found = assetGroupOf(main);
  if (found === null) {
    return null;
  }
  const { group, kind } = found;
  const problems: string[] = [];
  if (kind === 'mono') {
    const colors = new Set<string | undefined>();
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
          colors.add(await variableName(paint.boundVariables?.color, names));
        }
      }
    }
    const [color] = colors;
    if (colors.size !== 1 || color === undefined) {
      problems.push(
        colors.size > 1
          ? '한 가지 색 자산인데 색이 여럿이다'
          : '한 가지 색 자산의 색이 색 변수에 연결되어 있지 않다',
      );
    }
  }
  return { name: main.name, mainComponentId: main.id, group, kind, problems };
}

/**
 * 원본 컴포넌트가 든 자산 묶음(`group/<묶음>` 프레임)을 찾는다. 그 묶음이 처리 방식을 정한다.
 * @codocs [[피그마 연동:자산]]
 * @param main 원본 컴포넌트
 * @returns 묶음 이름과 처리 방식, 자산 묶음 밖이면 null
 */
export function assetGroupOf(main: ComponentNode): { group: string; kind: AssetKind } | null {
  const groups: Readonly<Partial<Record<string, AssetKind>>> = ASSET_GROUPS;
  for (
    let parent = main.parent;
    parent !== null && parent.type !== 'PAGE';
    parent = parent.parent
  ) {
    const name = parent.name.startsWith(ASSET_GROUP_PREFIX)
      ? parent.name.slice(ASSET_GROUP_PREFIX.length)
      : '';
    const kind = Object.keys(groups).includes(name) ? groups[name] : undefined;
    if (kind !== undefined) {
      return { group: name, kind };
    }
  }
  return null;
}

/**
 * 변수 별칭의 변수 이름을 찾는다.
 * @param alias 변수 별칭
 * @param names 이름 캐시
 * @returns 변수 이름, 없으면 undefined
 */
export async function variableName(
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
export async function styleName(
  id: string | symbol,
  names: NameCache,
): Promise<string | undefined> {
  if (typeof id !== 'string' || id === '') {
    return undefined;
  }
  if (!names.has(id)) {
    names.set(id, (await figma.getStyleByIdAsync(id))?.name);
  }
  return names.get(id);
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
