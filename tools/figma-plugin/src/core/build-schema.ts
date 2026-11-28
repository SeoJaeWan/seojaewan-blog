import {
  type AssetLayer,
  type AutoLayout,
  type Bindable,
  type BoxLayer,
  COMPONENT_SCHEMA_VERSION,
  type ComponentPage,
  type ComponentSchema,
  type Corners,
  type FigmaRgba,
  type InstanceLayer,
  type InstanceOverride,
  type Layer,
  type LayerBase,
  type Paint,
  type Paints,
  type Sides,
  type SlotContent,
  type SlotLayer,
  type Stroke,
  type TextLayer,
} from '../../../../packages/design-system/src/figma-contract';
import type { Bound, ComponentData, NodeData, PaintData, Rgb } from './node-data';

// 읽은 컴포넌트 데이터를 스키마(`<이름>.json`)로 옮기는 순수 계산이다. 피그마의 사실을 이름과 단위 그대로 적는다.
// 숨긴 레이어도 적고, 값은 반올림하지 않는다. 품은 인스턴스는 펼치지 않고 참조로 적는다.

// 틀 레이어로 적는 피그마 노드 종류
const BOX_TYPES = ['COMPONENT', 'FRAME', 'GROUP', 'RECTANGLE'] as const;
// 자산 인스턴스의 색 덮어쓰기로 보는 필드
const colorFields: readonly string[] = [
  'fills',
  'strokes',
  'fillStyleId',
  'strokeStyleId',
  'boundVariables.fills',
  'boundVariables.strokes',
];
// 자산 인스턴스 전체의 불투명도 덮어쓰기로 보는 필드
const opacityFields: readonly string[] = ['opacity', 'boundVariables.opacity'];

/**
 * 컴포넌트 데이터를 스키마로 옮긴다. 변형마다 전체를 적고, 기본 변형과의 차이로 적지 않는다.
 * CSS로 그릴 수 없어 구조 검사가 막는 노드(벡터, 타원 등)는 레이어로 적지 않는다(레이어 키는 그대로 센다).
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @param component 읽은 컴포넌트
 * @param page 놓인 페이지
 * @returns 스키마
 */
export function buildComponentSchema(
  component: ComponentData,
  page: ComponentPage,
): ComponentSchema {
  return {
    formatVersion: COMPONENT_SCHEMA_VERSION,
    name: component.name,
    nodeId: component.nodeId,
    page,
    description: component.description,
    behavior: component.behavior,
    properties: component.properties,
    variants: component.variants.map(
      /**
       * 변형 하나를 옮긴다.
       * @param variant 변형 데이터
       * @returns 변형 스키마
       */
      (variant) => ({
        name: variant.name,
        nodeId: variant.nodeId,
        values: variant.values,
        root: rootLayer(variant.root),
        transitions: variant.transitions,
        motion: variant.motion,
      }),
    ),
  };
}

/**
 * 변형 루트를 틀 레이어로 옮긴다.
 * @param root 변형 루트
 * @returns 틀 레이어
 */
function rootLayer(root: NodeData): BoxLayer {
  const layer = layerOf(root);
  if (layer?.kind !== 'box') {
    throw new Error(`변형 루트 ${root.name}를 틀 레이어로 읽을 수 없다.`);
  }
  return layer;
}

/**
 * 노드 하나를 레이어로 옮긴다.
 * @codocs [[디자인 시스템:스키마]]
 * @param node 노드
 * @returns 레이어. 스키마의 레이어 꼴로 옮길 수 없는 노드면 null
 */
export function layerOf(node: NodeData): Layer | null {
  const base = layerBase(node);
  if (node.asset !== null) {
    const assetLayer: AssetLayer = {
      ...base,
      kind: 'asset',
      figmaType: 'INSTANCE',
      asset: { group: node.asset.group, name: node.asset.name, file: node.asset.file },
      color: node.asset.color === null ? null : rgbBindable(node.asset.color),
      scaleMode: fitScaleMode(node.asset.scaleMode),
      sourceWidth: node.asset.sourceWidth,
      sourceHeight: node.asset.sourceHeight,
      scaleFactor: node.instance?.scaleFactor ?? 1,
    };
    return assetLayer;
  }
  if (node.instance !== null) {
    const instanceLayer: InstanceLayer = {
      ...base,
      kind: 'instance',
      figmaType: 'INSTANCE',
      component: node.instance.component,
      properties: node.instance.properties,
      isExposed: node.instance.isExposed,
      scaleFactor: node.instance.scaleFactor,
      overrides: instanceOverrides(node),
      slots: filledSlots(node),
    };
    return instanceLayer;
  }
  if (node.text !== null) {
    const textLayer: TextLayer = {
      ...base,
      ...appearance(node),
      kind: 'text',
      figmaType: 'TEXT',
      characters: node.text.characters,
      textStyle:
        node.text.segments.find((segment) => segment.textStyle !== undefined)?.textStyle ?? '',
      autoResize: node.text.autoResize,
      truncation: node.text.truncation,
      maxLines: node.text.maxLines,
      textAlignHorizontal: node.text.textAlignHorizontal,
      textAlignVertical: node.text.textAlignVertical,
    };
    return textLayer;
  }
  if (node.type === 'SLOT') {
    const slotLayer: SlotLayer = {
      ...base,
      ...appearance(node),
      ...boxFields(node),
      kind: 'slot',
      figmaType: 'SLOT',
      slotProperty: node.slotProperty ?? '',
    };
    return slotLayer;
  }
  const figmaType = BOX_TYPES.find((type) => type === node.type);
  if (figmaType === undefined) {
    return null;
  }
  return { ...base, ...appearance(node), ...boxFields(node), kind: 'box', figmaType };
}

/**
 * 모든 레이어가 갖는 값을 옮긴다.
 * @param node 노드
 * @returns 레이어 공통 값
 */
function layerBase(node: NodeData): LayerBase {
  return {
    key: node.key,
    name: node.name,
    nodeId: node.id,
    isVisible: node.isVisible,
    propertyRefs: node.propertyRefs,
    width: bindable(node.width),
    height: bindable(node.height),
    sizing: node.sizing,
    minWidth: optionalBindable(node.minWidth),
    maxWidth: optionalBindable(node.maxWidth),
    minHeight: optionalBindable(node.minHeight),
    maxHeight: optionalBindable(node.maxHeight),
    aspectRatio: node.aspectRatio,
    placement: node.placement,
    rotation: node.rotation,
    opacity: bindable(node.opacity),
  };
}

/**
 * 틀 레이어의 자동 배치·자르기·스크롤·자식을 옮긴다. 자식은 스키마의 레이어 꼴로 옮길 수 있는 것만 담는다.
 * @param node 노드
 * @returns 틀 레이어 값
 */
function boxFields(
  node: NodeData,
): Pick<BoxLayer, 'layout' | 'isClippingContent' | 'overflowDirection' | 'children'> {
  const { layout } = node;
  return {
    layout:
      layout === null
        ? null
        : {
            mode: layout.mode,
            wrap: layout.wrap,
            primaryAxisAlign: primaryAlignOf(layout.primaryAlign),
            counterAxisAlign: layout.counterAlign,
            counterAxisAlignContent: layout.counterAlignContent,
            padding: sidesBindable(layout.padding),
            itemSpacing: bindable(layout.itemSpacing),
            counterAxisSpacing:
              layout.wrap === 'WRAP' && layout.counterAxisSpacing !== null
                ? bindable(layout.counterAxisSpacing)
                : null,
            isReversingZIndex: layout.isReversingZIndex,
          },
    isClippingContent: node.isClippingContent,
    overflowDirection: node.overflowDirection,
    children: layersOf(node.children),
  };
}

/**
 * 자식 노드를 레이어로 옮긴다. 옮길 수 없는 노드는 뺀다.
 * @param nodes 자식 노드
 * @returns 레이어
 */
function layersOf(nodes: readonly NodeData[]): Layer[] {
  return nodes.map(layerOf).filter((layer): layer is Layer => layer !== null);
}

/**
 * 칠·선·모서리·효과를 옮긴다.
 * @codocs [[디자인 시스템:스키마]]
 * @param node 노드
 * @returns 모습
 */
function appearance(
  node: NodeData,
): Pick<BoxLayer, 'fills' | 'stroke' | 'cornerRadius' | 'effectStyle'> {
  const visibleStrokes = (node.strokes ?? []).filter((paint) => paint.isVisible);
  let stroke: Stroke | null = null;
  if (visibleStrokes.length > 0) {
    stroke = {
      paints: paintsOf(visibleStrokes, node.strokeStyle),
      weight: sidesBindable(node.strokeWeight ?? sides({ value: 0 })),
      align: node.strokeAlign,
      isIncludedInLayout: node.isStrokeIncludedInLayout,
    };
  }
  const zero: Bound = { value: 0 };
  return {
    fills: paintsOf(node.fills === 'mixed' ? [] : (node.fills ?? []), node.fillStyle),
    stroke,
    cornerRadius: cornersBindable(
      node.radius ?? { topLeft: zero, topRight: zero, bottomRight: zero, bottomLeft: zero },
    ),
    effectStyle: node.effectStyle ?? null,
  };
}

/**
 * 칠 목록을 옮긴다. 칠 스타일에 연결했으면 스타일 이름만, 아니면 보이는 칠을 피그마 순서로 적는다.
 * 스타일 없이 쓴 그라데이션처럼 구조 검사가 막는 칠은 적지 않는다.
 * @codocs [[디자인 시스템:스키마]]
 * @param paints 칠
 * @param style 연결한 칠 스타일 이름
 * @returns 칠 목록
 */
function paintsOf(paints: readonly PaintData[], style: string | undefined): Paints {
  if (style !== undefined) {
    return { style };
  }
  const result: Paint[] = [];
  for (const paint of paints) {
    if (!paint.isVisible) {
      continue;
    }
    if (paint.type === 'SOLID' && paint.color !== undefined) {
      result.push({
        type: 'SOLID',
        color: rgbBindable({ value: paint.color, variable: paint.variable }),
        opacity: paint.opacity,
      });
    }
    const scaleMode = fitScaleMode(paint.scaleMode ?? null);
    if (paint.type === 'IMAGE' && scaleMode !== null && paint.imageAsset != null) {
      result.push({ type: 'IMAGE', scaleMode, opacity: paint.opacity, asset: paint.imageAsset });
    }
  }
  return { paints: result };
}

/**
 * 인스턴스 안쪽 자산의 색과 자산 인스턴스 전체의 불투명도 덮어쓰기를 옮긴다. 구조 검사가 허용하는 덮어쓰기만이다.
 * 자산 안쪽 레이어의 색 덮어쓰기는 그 자산 인스턴스의 색으로 적는다.
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param instance 인스턴스 노드
 * @returns 덮어쓰기
 */
function instanceOverrides(instance: NodeData): InstanceOverride[] {
  const result: InstanceOverride[] = [];
  const assets = descendants(instance).filter((node) => node.asset !== null);
  for (const override of instance.instance?.overrides ?? []) {
    const target = assets.find(
      (node) => node.id === override.id || override.id.startsWith(`${node.id};`),
    );
    if (target?.asset == null) {
      continue;
    }
    const layer = relativeKey(instance.key, target.key);
    const { color } = target.asset;
    if (
      color !== null &&
      override.fields.some((field) => colorFields.includes(field)) &&
      !result.some((item) => item.kind === 'asset-color' && item.layer === layer)
    ) {
      result.push({ kind: 'asset-color', layer, color: rgbBindable(color) });
    }
    if (
      target.id === override.id &&
      override.fields.some((field) => opacityFields.includes(field)) &&
      !result.some((item) => item.kind === 'asset-opacity' && item.layer === layer)
    ) {
      result.push({ kind: 'asset-opacity', layer, opacity: bindable(target.opacity) });
    }
  }
  return result;
}

/**
 * 인스턴스 안에서 원본의 슬롯을 다른 내용으로 채운 자리를 옮긴다. 채우지 않은 슬롯은 적지 않는다.
 * 안쪽 인스턴스의 슬롯은 그 인스턴스가 적는다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param instance 인스턴스 노드
 * @returns 채운 슬롯
 */
function filledSlots(instance: NodeData): SlotContent[] {
  const result: SlotContent[] = [];
  /**
   * 인스턴스 안쪽(안쪽 인스턴스 밖)의 슬롯을 찾는다.
   * @param node 노드
   */
  function walk(node: NodeData): void {
    for (const child of node.children) {
      if (child.type === 'SLOT' && child.isSlotFilled) {
        result.push({
          slot: (child.slotProperty ?? '').split('#')[0] ?? '',
          layer: relativeKey(instance.key, child.key),
          children: layersOf(child.children),
        });
      } else if (child.instance === null) {
        walk(child);
      }
    }
  }
  walk(instance);
  return result;
}

/**
 * 노드 아래 모든 노드를 모은다.
 * @param node 노드
 * @returns 자손 노드
 */
function descendants(node: NodeData): NodeData[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

/**
 * 인스턴스 키 아래 레이어 키를 인스턴스 기준 키로 바꾼다.
 * @param instanceKey 인스턴스 키
 * @param key 안쪽 레이어 키
 * @returns 인스턴스 원본 컴포넌트 안의 키
 */
function relativeKey(instanceKey: string, key: string): string {
  return instanceKey === '' ? key : key.slice(instanceKey.length + 1);
}

/**
 * 주축 정렬을 스키마 꼴로 좁힌다. 스키마 꼴에 없는 정렬(`SPACE_EVENLY`, `SPACE_AROUND`)은 구조 검사가 막으므로 `MIN`으로 둔다.
 * @param align 피그마 주축 정렬
 * @returns 스키마의 주축 정렬
 */
function primaryAlignOf(
  align: NonNullable<NodeData['layout']>['primaryAlign'],
): AutoLayout['primaryAxisAlign'] {
  return align === 'SPACE_EVENLY' || align === 'SPACE_AROUND' ? 'MIN' : align;
}

/**
 * 이미지 칠 맞춤 방식을 스키마 꼴로 좁힌다. `CROP`·`TILE`은 구조 검사가 막으므로 null이다.
 * @param scaleMode 피그마 맞춤 방식
 * @returns `FILL`, `FIT`, 아니면 null
 */
function fitScaleMode(scaleMode: string | null): 'FILL' | 'FIT' | null {
  return scaleMode === 'FILL' || scaleMode === 'FIT' ? scaleMode : null;
}

/**
 * 변수 연결 값을 옮긴다. 연결했으면 변수만, 아니면 값 그대로다.
 * @param bound 값과 변수
 * @returns 스키마 값
 */
function bindable<T>(bound: Bound<T>): Bindable<T> {
  return bound.variable === undefined ? { value: bound.value } : { variable: bound.variable };
}

/**
 * 있을 수도 없을 수도 있는 값을 옮긴다.
 * @param bound 값과 변수. 없으면 null
 * @returns 스키마 값, 없으면 null
 */
function optionalBindable(bound: Bound | null): Bindable<number> | null {
  return bound === null ? null : bindable(bound);
}

/**
 * 단색을 옮긴다. 단색 칠의 색에는 투명도가 없어 a는 1이다(칠 불투명도는 따로 있다).
 * @param bound 색과 변수
 * @returns 스키마 색
 */
function rgbBindable(bound: Bound<Rgb>): Bindable<FigmaRgba> {
  return bound.variable === undefined
    ? { value: { ...bound.value, a: 1 } }
    : { variable: bound.variable };
}

/**
 * 네 변의 값을 옮긴다.
 * @param values 변마다 값
 * @returns 스키마 값
 */
function sidesBindable(values: Sides<Bound>): Sides<Bindable<number>> {
  return {
    top: bindable(values.top),
    right: bindable(values.right),
    bottom: bindable(values.bottom),
    left: bindable(values.left),
  };
}

/**
 * 네 모서리의 값을 옮긴다.
 * @param values 모서리마다 값
 * @returns 스키마 값
 */
function cornersBindable(values: Corners<Bound>): Corners<Bindable<number>> {
  return {
    topLeft: bindable(values.topLeft),
    topRight: bindable(values.topRight),
    bottomRight: bindable(values.bottomRight),
    bottomLeft: bindable(values.bottomLeft),
  };
}

/**
 * 네 변이 같은 값을 만든다.
 * @param value 값
 * @returns 네 변 값
 */
function sides<T>(value: T): Sides<T> {
  return { top: value, right: value, bottom: value, left: value };
}
