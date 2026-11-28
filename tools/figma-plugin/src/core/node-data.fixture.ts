import type {
  AssetData,
  Bound,
  ComponentData,
  InstanceData,
  NodeData,
  PaintData,
  Sides,
  TextData,
  TextSegmentData,
  VariantData,
} from './node-data';

// 스키마·검증 자료 만들기와 구조 검사 테스트용 노드 데이터. 피그마 Button 변형을 본뜬 정상 구조다.

/**
 * 색 변수 참조를 만든다.
 * @param name 변수 이름
 * @returns 변수 참조
 */
export function colorVariable(name: string): { collection: string; name: string } {
  return { collection: 'Color', name };
}

/**
 * 치수 변수에 연결한 값을 만든다.
 * @param value 값
 * @param name 변수 이름
 * @returns 값과 변수
 */
export function dimension(value: number, name: string): Bound {
  return { value, variable: { collection: 'Dimension', name } };
}

/**
 * 네 변이 같은 값을 만든다.
 * @param value 값
 * @returns 네 변
 */
export function sides(value: Bound): Sides<Bound> {
  return { top: value, right: value, bottom: value, left: value };
}

/**
 * 색 변수에 연결한 단색 칠을 만든다.
 * @param variable 색 변수 이름. 없으면 연결하지 않은 칠
 * @param opacity 칠 불투명도
 * @returns 칠
 */
export function solid(variable?: string, opacity = 1): PaintData {
  return {
    type: 'SOLID',
    isVisible: true,
    blendMode: 'NORMAL',
    opacity,
    color: { r: 0, g: 0, b: 0 },
    variable: variable === undefined ? undefined : colorVariable(variable),
  };
}

/**
 * 기본값을 채운 노드 데이터를 만든다. 이름은 키의 마지막 마디, ID는 키다.
 * @param overrides 바꿀 값
 * @returns 노드 데이터
 */
export function node(overrides: Partial<NodeData> & Pick<NodeData, 'key' | 'type'>): NodeData {
  return {
    id: overrides.key === '' ? 'root' : overrides.key,
    name: overrides.key.split('/').at(-1) ?? '',
    isVisible: true,
    isInsideInstance: false,
    propertyRefs: {},
    parentLayoutMode: 'HORIZONTAL',
    opacity: { value: 1 },
    rotation: 0,
    isMask: false,
    width: { value: 16 },
    height: { value: 16 },
    sizing: { horizontal: 'HUG', vertical: 'HUG' },
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    aspectRatio: null,
    box: { x: 100, y: 200, width: 16, height: 16 },
    fills: [],
    strokes: [],
    strokeAlign: 'INSIDE',
    dashPattern: [],
    hasVariableWidthStroke: false,
    hasComplexStroke: false,
    cornerSmoothing: 0,
    effects: [],
    layout: null,
    isClippingContent: false,
    overflowDirection: 'NONE',
    isStrokeIncludedInLayout: false,
    placement: {
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
      x: 0,
      y: 0,
    },
    text: null,
    asset: null,
    instance: null,
    slotProperty: null,
    isSlotFilled: false,
    children: [],
    ...overrides,
  };
}

/**
 * 글자 구간을 만든다.
 * @param overrides 바꿀 값
 * @returns 구간
 */
export function segment(overrides: Partial<TextSegmentData> = {}): TextSegmentData {
  return {
    characters: '버튼',
    fontFamily: 'Pretendard',
    textStyle: 'Body',
    overrides: [],
    fills: [solid('Black/89', 0.89)],
    hasOpenTypeFeatures: false,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: { unit: 'PIXELS', value: 20 },
    ...overrides,
  };
}

/**
 * 글자 데이터를 만든다.
 * @param overrides 바꿀 값
 * @returns 글자 데이터
 */
export function text(overrides: Partial<TextData> = {}): TextData {
  return {
    characters: '버튼',
    autoResize: 'WIDTH_AND_HEIGHT',
    hasMissingFont: false,
    truncation: 'DISABLED',
    maxLines: null,
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    segments: [segment()],
    ...overrides,
  };
}

/**
 * 한 가지 색 아이콘 자산 데이터를 만든다.
 * @param overrides 바꿀 값
 * @returns 자산 데이터
 */
export function iconAsset(overrides: Partial<AssetData> = {}): AssetData {
  return {
    name: 'ic_fluent_add_20_regular',
    mainComponentId: 'asset:add',
    group: 'Icons',
    file: 'icons/ic_fluent_add_20_regular',
    kind: 'mono',
    sourceWidth: 16,
    sourceHeight: 16,
    color: { value: { r: 0, g: 0, b: 0 }, variable: colorVariable('Black/89') },
    measuredColor: { r: 0, g: 0, b: 0 },
    scaleMode: null,
    problems: [],
    ...overrides,
  };
}

/**
 * 인스턴스 데이터를 만든다.
 * @param overrides 바꿀 값
 * @returns 인스턴스 데이터
 */
export function instance(overrides: Partial<InstanceData> = {}): InstanceData {
  return {
    component: 'Button',
    componentBehavior: null,
    scaleFactor: 1,
    isExposed: false,
    properties: {},
    overrides: [],
    ...overrides,
  };
}

/**
 * Button 변형 하나를 본뜬 정상 루트를 만든다. 숨긴 아이콘(불리언 속성에 묶임)과 글자가 있다.
 * @returns 루트 노드 데이터
 */
export function buttonRoot(): NodeData {
  const icon = node({
    key: 'icon',
    type: 'INSTANCE',
    isVisible: false,
    propertyRefs: { visible: 'Has icon#13:0', mainComponent: 'Icon#13:1' },
    asset: iconAsset(),
    instance: instance({ component: 'ic_fluent_add_20_regular' }),
  });
  const label = node({
    key: 'label',
    type: 'TEXT',
    propertyRefs: { characters: 'Label#13:2' },
    fills: [solid('Black/89', 0.89)],
    text: text(),
    box: { x: 147.5, y: 206, width: 25, height: 20 },
  });
  return node({
    key: '',
    type: 'COMPONENT',
    parentLayoutMode: null,
    placement: null,
    width: { value: 120 },
    height: { value: 32 },
    box: { x: 100, y: 200, width: 120, height: 32 },
    fills: [solid('White/70', 0.7)],
    strokes: [{ type: 'GRADIENT_LINEAR', isVisible: true, blendMode: 'NORMAL', opacity: 1 }],
    strokeStyle: 'Elevation/Control Border',
    strokeWeight: sides(dimension(1, 'stroke-width/default')),
    radius: {
      topLeft: dimension(4, 'radius/control'),
      topRight: dimension(4, 'radius/control'),
      bottomRight: dimension(4, 'radius/control'),
      bottomLeft: dimension(4, 'radius/control'),
    },
    layout: {
      mode: 'HORIZONTAL',
      wrap: 'NO_WRAP',
      primaryAlign: 'CENTER',
      counterAlign: 'CENTER',
      counterAlignContent: 'AUTO',
      padding: {
        top: dimension(6, 'spacing/sm-nudge'),
        right: dimension(12, 'spacing/md'),
        bottom: dimension(6, 'spacing/sm-nudge'),
        left: dimension(12, 'spacing/md'),
      },
      itemSpacing: dimension(8, 'spacing/sm'),
      counterAxisSpacing: null,
      isReversingZIndex: false,
    },
    children: [icon, label],
  });
}

/**
 * 변형 데이터를 만든다.
 * @param name 변형 이름
 * @param values 변형 축 값
 * @param root 변형 루트. 없으면 Button 루트
 * @returns 변형 데이터
 */
export function variant(
  name: string,
  values: Record<string, string>,
  root: NodeData = buttonRoot(),
): VariantData {
  return {
    name,
    nodeId: `variant:${name}`,
    values,
    root,
    transitions: [],
    motion: [],
    motionProblems: [],
  };
}

/**
 * 컴포넌트 데이터를 만든다.
 * @param overrides 바꿀 값
 * @returns 컴포넌트 데이터
 */
export function component(overrides: Partial<ComponentData> = {}): ComponentData {
  return {
    name: 'Button',
    nodeId: '13:62',
    page: 'Controls',
    description: '기본 버튼',
    behavior: null,
    sameNameCount: 1,
    properties: [],
    variants: [variant('Variant=Standard', { Variant: 'Standard' })],
    ...overrides,
  };
}
