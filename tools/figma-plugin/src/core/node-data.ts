// 피그마 노드에서 읽은 순수 데이터. read-node.ts가 피그마 API로 채우고, 구조 검사는 이 데이터만 쓴다.
// 피그마 API 없이 테스트할 수 있게 하기 위해서다.

/** 변수 연결. 연결이 없으면 value만 있다. */
export type Bound<T = number> = { value: T; variable?: string };

/**
 * 칠 하나의 데이터.
 * - variable: 단색 칠에 연결한 색 변수 이름
 * - imageHash: 이미지 칠의 이미지 해시
 */
export type PaintData = {
  type: string;
  isVisible: boolean;
  blendMode: string;
  variable?: string;
  imageHash?: string | null;
};

/** 효과 하나의 데이터. blurType: 배경·레이어 흐림의 종류(NORMAL, PROGRESSIVE). */
export type EffectData = {
  type: string;
  isVisible: boolean;
  blendMode: string;
  blurType?: string;
  isShadowShownBehindNode?: boolean;
};

export type Sides<T> = { top: T; right: T; bottom: T; left: T };

export type Corners<T> = { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T };

/**
 * 글자 서식이 같은 구간 하나.
 * - fontFamily: 구간 글꼴 패밀리(`fontName.family`). 읽지 못했으면 undefined
 * - textStyle: 글자 스타일 이름. 없으면 undefined
 * - overrides: 글자 스타일을 덮어쓴 항목
 */
export type TextSegmentData = {
  characters: string;
  fontFamily?: string;
  textStyle?: string;
  overrides: string[];
  fills: PaintData[];
  fillStyle?: string;
  hasOpenTypeFeatures: boolean;
};

/**
 * 글자 노드의 데이터.
 * - truncation: 말줄임(`DISABLED`, `ENDING`)
 * - maxLines: 최대 줄 수. 없으면 null
 */
export type TextData = {
  autoResize: string;
  hasMissingFont: boolean;
  truncation: string;
  maxLines: number | null;
  segments: TextSegmentData[];
};

export type LayoutData = {
  mode: string;
  wrap: string;
  primaryAlign: string;
  counterAlign: string;
  primarySizing: string;
  counterSizing: string;
  padding: Sides<Bound>;
  itemSpacing: Bound;
  counterAxisSpacing: Bound | null;
};

/** 부모 안에서의 자기 배치 */
export type ChildLayoutData = {
  sizingHorizontal: string;
  sizingVertical: string;
  positioning: string;
  constraints: { horizontal: string; vertical: string };
};

/** 자산 묶음의 처리 방식. mono: 한 가지 색(SVG, 색은 currentColor), color: 여러 색 SVG, raster: 래스터 이미지 */
export type AssetKind = 'mono' | 'color' | 'raster';

/**
 * Foundations 자산 컴포넌트의 인스턴스.
 * - name: 원본(메인) 컴포넌트 이름
 * - group: 원본 컴포넌트가 든 자산 묶음 이름(Icons, Shapes, Illustrations, Images)
 * - sourceWidth: 원본 컴포넌트 크기. 이미지 자산의 비율 검사에 쓴다
 * - color: 한 가지 색 자산에 칠한 색 변수 이름
 * - problems: 자산으로 쓸 수 없는 이유
 */
export type AssetData = {
  name: string;
  mainComponentId: string;
  group: string;
  kind: AssetKind;
  sourceWidth: number;
  sourceHeight: number;
  color?: string;
  problems: string[];
};

/**
 * 인스턴스에서 직접 덮어쓴 레이어 하나(`InstanceNode.overrides`의 항목).
 * - id: 덮어쓴 레이어 ID(인스턴스 자신이거나 안쪽 레이어)
 * - fields: 덮어쓴 필드 이름(`NodeChangeProperty`, 실제로는 `boundVariables`도 온다)
 * - changedBindings: `boundVariables`를 덮어썼을 때 원본 레이어와 변수 연결이 다른 필드 이름
 */
export type OverrideData = {
  id: string;
  fields: string[];
  changedBindings: string[];
};

/**
 * 인스턴스 정보.
 * - component: 원본 컴포넌트 이름. 변형이면 컴포넌트 세트 이름
 * - scaleFactor: 인스턴스 크기 배율. 줄인 인스턴스는 1이 아니다
 * - overrides: 이 인스턴스에서 직접 덮어쓴 레이어(물려받은 덮어쓰기는 없다)
 * - properties: 컴포넌트 속성(속성 이름 → 값). 구현 참고용이다
 */
export type InstanceData = {
  component: string;
  scaleFactor: number;
  overrides: OverrideData[];
  properties: Record<string, string | boolean>;
};

/**
 * 변형 전환의 움직임.
 * - type: 피그마 전환 종류(`SMART_ANIMATE` 등)
 * - easing.type: 피그마 이징 종류(`LINEAR`, `CUSTOM_CUBIC_BEZIER` 등)
 * - easing.bezier: 곡선 네 점. 직선은 `[0, 0, 1, 1]`, 곡선이 아닌 이징은 null
 */
export type TransitionData = {
  type: string;
  durationMs: number;
  easing: {
    type: string;
    bezier: number[] | null;
  };
};

/**
 * 변형 전환 하나(`reactions`의 노드 이동 항목).
 * - trigger: 피그마 트리거(`ON_HOVER`, `ON_PRESS`, `ON_CLICK` 등)
 * - destination: 목적지 노드 이름(변형 이름)
 * - navigation: 이동 방식(`CHANGE_TO` 등)
 * - transition: 전환. 바로 바뀌면 null
 */
export type ReactionData = {
  trigger: string;
  destination: string | null;
  navigation: string;
  transition: TransitionData | null;
};

/**
 * 변형 안 노드 하나의 데이터.
 * - path: 변형 루트 기준 레이어 경로. 루트는 빈 문자열
 * - parentLayoutMode: 부모의 자동 배치 방향. 루트이거나 부모가 자동 배치가 아니면 null
 * - isStrokeIncludedInLayout: 선이 레이아웃에 들어가는지(strokes included in layout)
 * - aspectRatio: 잠긴 비율(너비 ÷ 높이). 잠기지 않았으면 null
 * - reactions: 변형 전환. 변형 루트에서만 읽는다
 * - instance: 인스턴스면 원본 컴포넌트와 덮어쓰기, 아니면 null
 * - isFullEllipse: ELLIPSE가 호가 아닌 완전한 원이면 true
 * - children: 보이는 자식. 숨긴 노드는 읽지 않는다
 */
export type NodeData = {
  id: string;
  name: string;
  type: string;
  path: string;
  parentLayoutMode: string | null;
  opacity: Bound;
  rotation: number;
  isMask: boolean;
  width: Bound;
  height: Bound;
  minWidth: Bound | null;
  maxWidth: Bound | null;
  minHeight: Bound | null;
  maxHeight: Bound | null;
  fills: PaintData[] | 'mixed' | null;
  fillStyle?: string;
  strokes: PaintData[] | null;
  strokeStyle?: string;
  strokeWeight?: Sides<Bound>;
  dashPattern: readonly number[];
  hasVariableWidthStroke: boolean;
  hasComplexStroke: boolean;
  radius?: Corners<Bound>;
  cornerSmoothing: number;
  effects: EffectData[] | null;
  effectStyle?: string;
  layout: LayoutData | null;
  isStrokeIncludedInLayout: boolean;
  aspectRatio: number | null;
  annotations: AnnotationData[];
  reactions: ReactionData[];
  child: ChildLayoutData | null;
  text: TextData | null;
  asset: AssetData | null;
  instance: InstanceData | null;
  isFullEllipse: boolean | null;
  children: NodeData[];
};

/**
 * 레이어의 Dev Mode 주석 하나.
 * - text: 주석 글(평문)
 * - category: 주석 카테고리 이름(`Development`, `Accessibility` 등). 카테고리가 없으면 null
 */
export type AnnotationData = {
  text: string;
  category: string | null;
};
