import { parityDecisions } from '../../../../packages/design-system/scripts/parity/rules/decisions';
import type {
  AssetData,
  AssetKind,
  Bound,
  ChildLayoutData,
  Corners,
  EffectData,
  LayoutData,
  NodeData,
  PaintData,
  Sides,
  TextData,
  TextSegmentData,
  TextStyleFields,
} from './node-data';

// 피그마 노드를 node-data.ts의 순수 데이터로 읽는다. 변수·스타일은 이름으로 바꿔 둔다.
// 플러그인과 피그마 MCP(use_figma) 양쪽에서 같은 코드가 실행된다. 노드를 바꾸지 않는다(읽기 전용).

/** 변수·스타일 ID → 이름 캐시 */
export type NameCache = Map<string, string | undefined>;

// 회전·크기 비교에 쓰는 소수 오차다.
const EPSILON = 1e-6;

/**
 * 변형 루트와 그 아래 보이는 노드를 읽는다. 숨긴 노드는 읽지 않고 경로만 남긴다
 * (숨긴 노드는 자동 배치 크기 같은 값을 잘못 돌려주기 때문이다).
 * 자산 인스턴스(Foundations 자산 묶음의 컴포넌트)는 안쪽을 읽지 않고 이름·묶음·색만 읽는다.
 * @codocs [[피그마 일치 검사:피그마 플러그인]]
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
  const bound = boundVariables(node);
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
    blendMode: 'blendMode' in node ? node.blendMode : 'PASS_THROUGH',
    rotation: 'rotation' in node ? node.rotation : 0,
    hasSkewOrFlip: hasSkewOrFlip(node),
    isMask: 'isMask' in node ? node.isMask : false,
    explicitModeCount: Object.keys(node.explicitVariableModes).length,
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
    clipsContent: 'clipsContent' in node ? node.clipsContent : null,
    layout: null,
    child: null,
    text: null,
    asset: null,
    isFullEllipse: node.type === 'ELLIPSE' ? isFullEllipse(node) : null,
    children: [],
    hiddenChildren: [],
  };

  if ('fills' in node) {
    data.fills = node.fills === figma.mixed ? 'mixed' : await paintsData(node.fills, names);
    data.fillStyle = await styleName('fillStyleId' in node ? node.fillStyleId : '', names);
  }
  if ('strokes' in node) {
    data.strokes = await paintsData(node.strokes, names);
    data.strokeStyle = await styleName(node.strokeStyleId, names);
    data.strokeAlign = node.strokeAlign;
    data.strokeWeight = await strokeWeights(node, bound, names);
    data.strokeJoin =
      'strokeJoin' in node && typeof node.strokeJoin === 'string' ? node.strokeJoin : undefined;
    data.strokeCap =
      'strokeCap' in node && typeof node.strokeCap === 'string' ? node.strokeCap : undefined;
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
    const asset = await assetData(node, names);
    if (asset !== null) {
      data.asset = asset;
      return data;
    }
  }
  // G1: 슬롯은 내용을 담는 자리라 슬롯 자체의 배치만 비교한다. 안쪽 내용은 쓰는 쪽이 정한다.
  if (node.type === 'SLOT') {
    return data;
  }
  if ('children' in node) {
    for (const child of node.children) {
      const childPath = path === '' ? child.name : `${path}/${child.name}`;
      if (!child.visible) {
        data.hiddenChildren.push({
          path: childPath,
          visibleProperty: child.componentPropertyReferences?.visible,
        });
        continue;
      }
      data.children.push(await readNode(child, childPath, node, names));
    }
  }
  return data;
}

/**
 * 노드의 변수 연결 표를 읽는다.
 * @param node 노드
 * @returns 필드 이름 → 변수 별칭
 */
function boundVariables(node: SceneNode): Partial<Record<string, VariableAlias>> {
  const result: Partial<Record<string, VariableAlias>> = {};
  for (const [field, value] of Object.entries(node.boundVariables ?? {})) {
    const id: unknown = typeof value === 'object' ? Reflect.get(value, 'id') : undefined;
    if (typeof id === 'string') {
      result[field] = { type: 'VARIABLE_ALIAS', id };
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
 * 회전 밖의 변환(뒤집기·기울이기)이 있는지 확인한다.
 * @param node 노드
 * @returns 있으면 true
 */
function hasSkewOrFlip(node: SceneNode): boolean {
  if (!('relativeTransform' in node)) {
    return false;
  }
  const [[a, c], [b, d]] = node.relativeTransform;
  const determinant = a * d - b * c;
  const isOrthogonal = Math.abs(a * c + b * d) < EPSILON;
  return determinant < 0 || !isOrthogonal || Math.abs(Math.abs(determinant) - 1) > EPSILON;
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
      opacity: 'opacity' in paint ? (paint.opacity ?? 1) : 1,
      variable:
        paint.type === 'SOLID' ? await variableName(paint.boundVariables?.color, names) : undefined,
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
    counterAlign: node.counterAxisAlignItems,
    alignContent: node.counterAxisAlignContent,
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
    itemReverseZIndex: node.itemReverseZIndex,
    strokesIncludedInLayout: node.strokesIncludedInLayout,
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
    layoutAlign: 'layoutAlign' in node ? node.layoutAlign : 'INHERIT',
    layoutGrow: 'layoutGrow' in node ? node.layoutGrow : 0,
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
    'textDecoration',
    'textCase',
    'textWrapStyle',
    'paragraphIndent',
    'paragraphSpacing',
    'listSpacing',
    'indentation',
    'listOptions',
    'openTypeFeatures',
    'textStyleOverrides',
    'textDecorationStyle',
    'textDecorationOffset',
    'textDecorationThickness',
    'textDecorationColor',
    'textDecorationSkipInk',
  ])) {
    const textStyle = await styleName(segment.textStyleId, names);
    segments.push({
      characters: segment.characters,
      start: segment.start,
      end: segment.end,
      fontFamily: segment.fontName.family,
      fontStyle: segment.fontName.style,
      textStyle,
      styleFields:
        segment.textStyleId === '' ? undefined : await textStyleFields(segment.textStyleId, names),
      overrides: segment.textStyleOverrides.map((override) => override.type),
      fills: await paintsData(segment.fills, names),
      fillStyle: await styleName(segment.fillStyleId, names),
      textDecoration: segment.textDecoration,
      textCase: segment.textCase,
      textWrapStyle: segment.textWrapStyle,
      paragraphIndent: segment.paragraphIndent,
      paragraphSpacing: segment.paragraphSpacing,
      listSpacing: segment.listSpacing,
      indentation: segment.indentation,
      listType: segment.listOptions.type,
      hasOpenTypeFeatures: Object.values(segment.openTypeFeatures).some(Boolean),
      hasDecorationDetails:
        (segment.textDecorationStyle ?? 'SOLID') !== 'SOLID' ||
        (segment.textDecorationOffset ?? { unit: 'AUTO' }).unit !== 'AUTO' ||
        (segment.textDecorationThickness ?? { unit: 'AUTO' }).unit !== 'AUTO' ||
        (segment.textDecorationColor ?? { value: 'AUTO' }).value !== 'AUTO' ||
        segment.textDecorationSkipInk === false,
    });
  }
  return {
    characters: node.characters,
    autoResize: node.textAutoResize,
    alignHorizontal: node.textAlignHorizontal,
    alignVertical: node.textAlignVertical,
    truncation: node.textTruncation,
    maxLines: node.maxLines,
    leadingTrim: node.leadingTrim === figma.mixed ? 'MIXED' : node.leadingTrim,
    hasMissingFont: node.hasMissingFont,
    hangingPunctuation: node.hangingPunctuation,
    hangingList: node.hangingList,
    segments,
  };
}

/**
 * 글자 스타일이 묶는 크기·줄 높이·굵기·자간을 변수 이름(연결이 없으면 값)으로 읽는다.
 * @param styleId 글자 스타일 ID
 * @param names 이름 캐시
 * @returns 스타일 값, 스타일을 찾지 못하면 undefined
 */
async function textStyleFields(
  styleId: string,
  names: NameCache,
): Promise<TextStyleFields | undefined> {
  const style = await figma.getStyleByIdAsync(styleId);
  if (style === null || style.type !== 'TEXT') {
    return undefined;
  }
  const bound = style.boundVariables ?? {};
  return {
    fontSize: { value: style.fontSize, variable: await variableName(bound.fontSize, names) },
    lineHeight: {
      value:
        style.lineHeight.unit === 'AUTO'
          ? 'AUTO'
          : `${String(style.lineHeight.value)}${style.lineHeight.unit === 'PIXELS' ? 'px' : '%'}`,
      variable: await variableName(bound.lineHeight, names),
    },
    fontWeight: {
      value: style.fontName.style,
      variable: await variableName(bound.fontWeight ?? bound.fontStyle, names),
    },
    letterSpacing: {
      value: `${String(style.letterSpacing.value)}${style.letterSpacing.unit === 'PIXELS' ? 'px' : '%'}`,
      variable: await variableName(bound.letterSpacing, names),
    },
  };
}

/**
 * Foundations 자산 컴포넌트의 인스턴스인지 확인하고 이름·묶음·색을 읽는다(D6).
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
  const groups: Readonly<Record<string, AssetKind>> = parityDecisions.d6.assetGroups;
  let group: string | undefined;
  for (
    let parent = main.parent;
    parent !== null && parent.type !== 'PAGE';
    parent = parent.parent
  ) {
    const prefix = parityDecisions.d6.assetGroupPrefix;
    const name = parent.name.startsWith(prefix) ? parent.name.slice(prefix.length) : '';
    if (name in groups) {
      group = name;
      break;
    }
  }
  const kind = group === undefined ? undefined : groups[group];
  if (group === undefined || kind === undefined) {
    return null;
  }
  const problems: string[] = [];
  let colorVariable: string | undefined;
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
    } else {
      colorVariable = color;
    }
  }
  return { name: main.name, mainComponentId: main.id, group, kind, colorVariable, problems };
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
