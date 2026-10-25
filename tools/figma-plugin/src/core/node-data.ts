// 피그마 노드에서 읽은 순수 데이터. read-node.ts가 피그마 API로 채우고, 구조 검사는 이 데이터만 쓴다.
// 피그마 API 없이 테스트할 수 있게 하기 위해서다.

/** 변수 연결. 연결이 없으면 value만 있다. */
export type Bound<T = number> = { value: T; variable?: string };

export type PaintData = {
  type: string;
  visible: boolean;
  blendMode: string;
  /** 단색 칠에 연결한 색 변수 이름 */
  variable?: string;
  /** 이미지 칠의 이미지 해시 */
  imageHash?: string | null;
};

export type EffectData = {
  type: string;
  visible: boolean;
  blendMode: string;
  /** 배경·레이어 흐림의 종류(NORMAL, PROGRESSIVE) */
  blurType?: string;
  showShadowBehindNode?: boolean;
};

export type Sides<T> = { top: T; right: T; bottom: T; left: T };

export type Corners<T> = { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T };

export type TextSegmentData = {
  characters: string;
  /** 글자 스타일 이름. 없으면 undefined */
  textStyle?: string;
  /** 글자 스타일을 덮어쓴 항목 */
  overrides: string[];
  fills: PaintData[];
  fillStyle?: string;
  hasOpenTypeFeatures: boolean;
};

export type TextData = {
  autoResize: string;
  hasMissingFont: boolean;
  segments: TextSegmentData[];
};

export type LayoutData = {
  mode: string;
  wrap: string;
  primaryAlign: string;
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

/** Foundations 자산 컴포넌트의 인스턴스 */
export type AssetData = {
  /** 원본(메인) 컴포넌트 이름 */
  name: string;
  mainComponentId: string;
  /** 원본 컴포넌트가 든 자산 묶음 이름(Icons, Shapes, Illustrations, Images) */
  group: string;
  kind: AssetKind;
  /** 자산으로 쓸 수 없는 이유 */
  problems: string[];
};

/** 인스턴스에서 직접 덮어쓴 레이어 하나(`InstanceNode.overrides`의 항목) */
export type OverrideData = {
  /** 덮어쓴 레이어 ID(인스턴스 자신이거나 안쪽 레이어) */
  id: string;
  /** 덮어쓴 필드 이름(`NodeChangeProperty`, 실제로는 `boundVariables`도 온다) */
  fields: string[];
  /** `boundVariables`를 덮어썼을 때 원본 레이어와 변수 연결이 다른 필드 이름 */
  changedBindings: string[];
};

/** 인스턴스 정보 */
export type InstanceData = {
  /** 원본 컴포넌트 이름. 변형이면 컴포넌트 세트 이름 */
  component: string;
  /** 인스턴스 크기 배율. 줄인 인스턴스는 1이 아니다 */
  scaleFactor: number;
  /** 이 인스턴스에서 직접 덮어쓴 레이어(물려받은 덮어쓰기는 없다) */
  overrides: OverrideData[];
};

export type NodeData = {
  id: string;
  name: string;
  type: string;
  /** 변형 루트 기준 레이어 경로. 루트는 빈 문자열 */
  path: string;
  /** 부모의 자동 배치 방향. 루트이거나 부모가 자동 배치가 아니면 null */
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
  variableWidthStroke: boolean;
  complexStroke: boolean;
  radius?: Corners<Bound>;
  cornerSmoothing: number;
  effects: EffectData[] | null;
  effectStyle?: string;
  layout: LayoutData | null;
  child: ChildLayoutData | null;
  text: TextData | null;
  asset: AssetData | null;
  /** 인스턴스면 원본 컴포넌트와 덮어쓰기, 아니면 null */
  instance: InstanceData | null;
  /** ELLIPSE가 호가 아닌 완전한 원이면 true */
  isFullEllipse: boolean | null;
  /** 보이는 자식. 숨긴 노드는 읽지 않는다 */
  children: NodeData[];
};
