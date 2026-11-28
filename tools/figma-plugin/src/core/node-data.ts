import type {
  AssetGroup,
  AssetRef,
  ComponentPage,
  FigmaRgba,
  MotionTimeline,
  PropertyDefinition,
  PropertyValue,
  VariableRef,
  VariantTransition,
} from '../../../../packages/design-system/src/figma-contract';

// 피그마 노드에서 읽은 순수 데이터. read-node.ts가 피그마 API로 채우고, 스키마·검증 자료 만들기(build-schema.ts,
// build-layout.ts)와 구조 검사(check-structure.ts)는 이 데이터만 쓴다. 피그마 API 없이 테스트할 수 있게 하기 위해서다.
// 값은 피그마 값 그대로다(색 0~1, 시간 초, 회전은 반시계 방향이 +). 단위를 바꾸는 것은 build-layout.ts다.

/** 변수 연결. 연결이 없으면 value만 있다. */
export type Bound<T = number> = { value: T; variable?: VariableRef };

/** 피그마 RGB 색(0~1). 단색 칠의 색에는 투명도가 없다 */
export type Rgb = { r: number; g: number; b: number };

/**
 * 칠 하나의 데이터.
 * - color: 단색 칠의 색(0~1). 색 변수에 연결했으면 variable이 함께 있다
 * - opacity: 칠 불투명도(0~1)
 * - imageHash, scaleMode: 이미지 칠의 이미지 해시와 맞춤 방식(`FILL`, `FIT`, `CROP`, `TILE`)
 * - imageAsset: 이미지 해시로 찾은 이름 있는 Images 자산. 없으면 null(구조 검사가 막는다)
 * - gradientStops: 그라데이션 칠의 색 단계(피그마가 돌려준 최종 색, 0~1)
 */
export type PaintData = {
  type: string;
  isVisible: boolean;
  blendMode: string;
  opacity: number;
  color?: Rgb;
  variable?: VariableRef;
  imageHash?: string | null;
  scaleMode?: string;
  imageAsset?: AssetRef | null;
  gradientStops?: { position: number; color: FigmaRgba }[];
};

/**
 * 효과 하나의 데이터.
 * - blurType: 배경·레이어 흐림의 종류(NORMAL, PROGRESSIVE)
 * - shadow: 그림자 효과의 최종 값(효과 스타일을 푼 값)
 */
export type EffectData = {
  type: string;
  isVisible: boolean;
  blendMode: string;
  blurType?: string;
  isShadowShownBehindNode?: boolean;
  shadow?: { color: FigmaRgba; offsetX: number; offsetY: number; radius: number; spread: number };
};

export type Sides<T> = { top: T; right: T; bottom: T; left: T };

export type Corners<T> = { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T };

/** 글자 줄 높이. 피그마 단위 그대로다 */
export type LineHeightData =
  { unit: 'PIXELS'; value: number } | { unit: 'PERCENT'; value: number } | { unit: 'AUTO' };

/**
 * 글자 서식이 같은 구간 하나.
 * - fontFamily: 구간 글꼴 패밀리(`fontName.family`)
 * - textStyle: 글자 스타일 이름. 없으면 undefined
 * - overrides: 글자 스타일을 덮어쓴 항목
 * - fontSize, fontWeight, lineHeight: 피그마가 돌려준 구간의 글자 값
 */
export type TextSegmentData = {
  characters: string;
  fontFamily?: string;
  textStyle?: string;
  overrides: string[];
  fills: PaintData[];
  fillStyle?: string;
  hasOpenTypeFeatures: boolean;
  fontSize: number;
  fontWeight: number;
  lineHeight: LineHeightData;
};

/**
 * 글자 노드의 데이터.
 * - characters: 기본 글자
 * - truncation: 말줄임(`DISABLED`, `ENDING`)
 * - maxLines: 최대 줄 수. 없으면 null
 */
export type TextData = {
  characters: string;
  autoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
  hasMissingFont: boolean;
  truncation: 'DISABLED' | 'ENDING';
  maxLines: number | null;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  segments: TextSegmentData[];
};

/** 자동 배치(`layoutMode`가 `HORIZONTAL`·`VERTICAL`). primaryAlign은 피그마 값 그대로라 스키마 꼴에 없는 값(`SPACE_EVENLY`, `SPACE_AROUND`)도 담는다 */
export type LayoutData = {
  mode: 'HORIZONTAL' | 'VERTICAL';
  wrap: 'NO_WRAP' | 'WRAP';
  primaryAlign: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | 'SPACE_EVENLY' | 'SPACE_AROUND';
  counterAlign: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAlignContent: 'AUTO' | 'SPACE_BETWEEN';
  padding: Sides<Bound>;
  itemSpacing: Bound;
  counterAxisSpacing: Bound | null;
  isReversingZIndex: boolean;
};

/**
 * 부모 안에서의 자기 배치. 변형 루트에는 없다.
 * - x, y: 부모 기준 위치(피그마 `x`, `y`)
 */
export type PlacementData = {
  positioning: 'AUTO' | 'ABSOLUTE';
  constraints: {
    horizontal: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
  };
  x: number;
  y: number;
};

/** 자산 묶음의 처리 방식. mono: 한 가지 색(SVG, 색은 currentColor), color: 여러 색 SVG, raster: 래스터 이미지 */
export type AssetKind = 'mono' | 'color' | 'raster';

/**
 * Foundations 자산 컴포넌트의 인스턴스.
 * - name: 원본(메인) 컴포넌트 이름 그대로
 * - group: 원본 컴포넌트가 놓인 구역으로 정한 자산 묶음
 * - file: 자산 원본 파일의 `src/assets/` 기준 경로에서 확장자를 뺀 것(`icons/ic_fluent_add_20_regular`)
 * - sourceWidth, sourceHeight: 원본 컴포넌트 크기
 * - color: 한 가지 색 자산에 칠한 색. 색이 하나로 정해지지 않으면 null
 * - measuredColor: 한 가지 색 자산에 칠한 색의 피그마 최종 값(0~1). 없으면 null
 * - scaleMode: 이미지 자산의 이미지 칠 맞춤 방식. 이미지가 아니면 null
 * - problems: 자산으로 쓸 수 없는 이유
 */
export type AssetData = {
  name: string;
  mainComponentId: string;
  group: AssetGroup;
  file: string;
  kind: AssetKind;
  sourceWidth: number;
  sourceHeight: number;
  color: Bound<Rgb> | null;
  measuredColor: Rgb | null;
  scaleMode: string | null;
  problems: string[];
};

/**
 * 인스턴스에서 원본과 값이 달라진 모양 덮어쓰기 하나.
 * - id: 덮어쓴 레이어 ID(인스턴스 자신이거나 안쪽 레이어)
 * - fields: 원본과 값이 다른 모양 필드(`fills`, `opacity`, `boundVariables.fills` 등)
 */
export type OverrideData = {
  id: string;
  fields: string[];
};

/**
 * 인스턴스 정보.
 * - component: 원본 컴포넌트 이름. 변형이면 컴포넌트 세트 이름
 * - componentBehavior: 원본 컴포넌트(세트)의 `Interaction` 주석에 적힌 동작의 종류. 없으면 null
 * - scaleFactor: 인스턴스 크기 배율. 줄인 인스턴스는 1이 아니다
 * - isExposed: 중첩 인스턴스 속성 노출(`isExposedInstance`)
 * - properties: 인스턴스의 속성 값. 키는 `#id`를 뗀 속성 이름이다
 * - overrides: 원본과 값이 달라진 모양 덮어쓰기. 변형 안에 바로 놓인 인스턴스에서만 읽는다
 */
export type InstanceData = {
  component: string;
  componentBehavior: string | null;
  scaleFactor: number;
  isExposed: boolean;
  properties: Record<string, PropertyValue>;
  overrides: OverrideData[];
};

/**
 * 변형 안 노드 하나의 데이터.
 * - key: 레이어 키(변형 루트는 빈 문자열). 숨긴 형제도 세어 정한다
 * - isVisible: 보이는지. 숨긴 노드도 읽는다(숨긴 레이어는 켜고 끄는 속성으로 그린다)
 * - isInsideInstance: 품은 인스턴스 안쪽 레이어인지. 스키마에는 적지 않고 검증 자료와 검사에만 쓴다
 * - propertyRefs: 연결된 컴포넌트 속성의 키(`componentPropertyReferences`)
 * - parentLayoutMode: 부모의 자동 배치 방향. 루트이거나 부모가 자동 배치가 아니면 null
 * - box: 피그마가 계산한 자리와 크기(`absoluteBoundingBox`). 읽지 못했으면 null
 * - placement: 부모 안에 놓인 방식. 변형 루트는 null
 * - slotProperty: SLOT 노드면 그 슬롯의 `SLOT` 속성 키(찾지 못하면 빈 문자열). SLOT이 아니면 null
 * - isSlotFilled: 인스턴스 안의 SLOT 노드가 원본 슬롯의 기본 내용과 다른 내용으로 채워졌는지. 그 밖에는 false
 * - children: 자식. 피그마 `children` 순서이고 숨긴 노드도 담는다. 자산 인스턴스는 안쪽을 읽지 않는다
 */
export type NodeData = {
  id: string;
  name: string;
  type: string;
  key: string;
  isVisible: boolean;
  isInsideInstance: boolean;
  propertyRefs: { visible?: string; characters?: string; mainComponent?: string };
  parentLayoutMode: string | null;
  opacity: Bound;
  rotation: number;
  isMask: boolean;
  width: Bound;
  height: Bound;
  sizing: { horizontal: 'FIXED' | 'HUG' | 'FILL'; vertical: 'FIXED' | 'HUG' | 'FILL' };
  minWidth: Bound | null;
  maxWidth: Bound | null;
  minHeight: Bound | null;
  maxHeight: Bound | null;
  aspectRatio: number | null;
  box: { x: number; y: number; width: number; height: number } | null;
  fills: PaintData[] | 'mixed' | null;
  fillStyle?: string;
  strokes: PaintData[] | null;
  strokeStyle?: string;
  strokeWeight?: Sides<Bound>;
  strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  dashPattern: readonly number[];
  hasVariableWidthStroke: boolean;
  hasComplexStroke: boolean;
  radius?: Corners<Bound>;
  cornerSmoothing: number;
  effects: EffectData[] | null;
  effectStyle?: string;
  layout: LayoutData | null;
  isClippingContent: boolean;
  overflowDirection: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
  isStrokeIncludedInLayout: boolean;
  placement: PlacementData | null;
  text: TextData | null;
  asset: AssetData | null;
  instance: InstanceData | null;
  slotProperty: string | null;
  isSlotFilled: boolean;
  children: NodeData[];
};

/**
 * 키프레임을 읽다 알게 된, 내보낼 수 없는 것.
 * - nodeId: 키프레임이 걸린 노드
 * - layer: 그 노드의 레이어 키(자산 원본 안이면 자산 인스턴스의 키)
 * - property: 피그마 키프레임 항목 이름(`WIDTH`, `fills[0]` 등)
 */
export type MotionProblem = {
  nodeId: string;
  layer: string;
  property: string;
  reason: string;
};

/**
 * 변형 하나의 데이터.
 * - name: 피그마 변형 이름. 변형이 없는 컴포넌트는 컴포넌트 이름이다
 * - values: 변형 축 이름 → 값. 변형이 없는 컴포넌트는 빈 객체
 * - motion: 이 변형에서 도는 키프레임(옮기는 항목만)
 * - motionProblems: 옮기는 항목 밖의 키프레임 등
 */
export type VariantData = {
  name: string;
  nodeId: string;
  values: Record<string, string>;
  root: NodeData;
  transitions: VariantTransition[];
  motion: MotionTimeline[];
  motionProblems: MotionProblem[];
};

/**
 * 컴포넌트 하나(세트이거나 변형이 없는 컴포넌트)의 데이터.
 * - page: 놓인 페이지. Controls·Shell·Blog가 아니면 null
 * - behavior: `Interaction` 분류 Dev Mode 주석에 적힌 동작의 종류. 없으면 null
 * - sameNameCount: 내보내는 페이지에서 이 이름을 가진 컴포넌트(세트와 변형이 없는 컴포넌트) 수
 * - properties: 컴포넌트 속성 정의(스키마 꼴)
 */
export type ComponentData = {
  name: string;
  nodeId: string;
  page: ComponentPage | null;
  description: string;
  behavior: string | null;
  sameNameCount: number;
  properties: PropertyDefinition[];
  variants: VariantData[];
};
