// 피그마 노드에서 읽은 순수 데이터. read-node.ts가 피그마 API로 채우고, 구조 검사와 export.json 만들기는 이 데이터만 쓴다.
// 피그마 API 없이 테스트할 수 있게 하기 위해서다.

/** 변수·스타일 연결. 연결이 없으면 value만 있다. */
export type Bound<T = number> = { value: T; variable?: string };

export type PaintData = {
  type: string;
  visible: boolean;
  blendMode: string;
  opacity: number;
  /** 단색 칠에 연결한 색 변수 이름 */
  variable?: string;
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

/** 글자 스타일에 연결된 크기·줄 높이·굵기·자간. 변수에 연결되지 않은 값은 값만 남긴다 */
export type TextStyleFields = {
  fontSize: Bound;
  lineHeight: Bound<string>;
  fontWeight: Bound<string>;
  letterSpacing: Bound<string>;
};

export type TextSegmentData = {
  characters: string;
  start: number;
  end: number;
  fontFamily: string;
  fontStyle: string;
  /** 글자 스타일 이름. 없으면 undefined */
  textStyle?: string;
  /** 글자 스타일이 묶는 값. 스타일이 없으면 undefined */
  styleFields?: TextStyleFields;
  /** 글자 스타일을 덮어쓴 항목 */
  overrides: string[];
  fills: PaintData[];
  fillStyle?: string;
  textDecoration: string;
  textCase: string;
  textWrapStyle?: string;
  paragraphIndent: number;
  paragraphSpacing: number;
  listSpacing: number;
  indentation: number;
  listType: string;
  hasOpenTypeFeatures: boolean;
  /** 밑줄 모양·위치·두께·색·잉크 건너뛰기가 기본값이 아니면 true */
  hasDecorationDetails: boolean;
};

export type TextData = {
  characters: string;
  autoResize: string;
  alignHorizontal: string;
  alignVertical: string;
  truncation: string;
  maxLines: number | null;
  leadingTrim: string;
  hasMissingFont: boolean;
  hangingPunctuation: boolean;
  hangingList: boolean;
  segments: TextSegmentData[];
};

export type LayoutData = {
  mode: string;
  wrap: string;
  primaryAlign: string;
  counterAlign: string;
  alignContent: string;
  primarySizing: string;
  counterSizing: string;
  padding: Sides<Bound>;
  itemSpacing: Bound;
  counterAxisSpacing: Bound | null;
  itemReverseZIndex: boolean;
  strokesIncludedInLayout: boolean;
};

/** 자동 배치 부모 안에서의 자기 배치 */
export type ChildLayoutData = {
  sizingHorizontal: string;
  sizingVertical: string;
  layoutAlign: string;
  layoutGrow: number;
  positioning: string;
  constraints: { horizontal: string; vertical: string };
};

/** 자산 묶음의 처리 방식(D6). mono: 한 가지 색(SVG, 색은 currentColor), color: 여러 색 SVG, raster: 래스터 이미지 */
export type AssetKind = 'mono' | 'color' | 'raster';

/** Foundations 자산 컴포넌트의 인스턴스 */
export type AssetData = {
  /** 원본(메인) 컴포넌트 이름 */
  name: string;
  mainComponentId: string;
  /** 원본 컴포넌트가 든 자산 묶음 이름(Icons, Shapes, Illustrations, Images) */
  group: string;
  kind: AssetKind;
  /** 한 가지 색 자산의 칠 색 변수 이름. 하나로 정해지지 않으면 undefined */
  colorVariable?: string;
  /** 자산으로 쓸 수 없는 이유 */
  problems: string[];
};

/** 숨긴 레이어 */
export type HiddenLayer = {
  /** 레이어 경로 */
  path: string;
  /** 보이기를 정하는 BOOLEAN 컴포넌트 속성 키(`Show icon#13:0`). 없으면 undefined */
  visibleProperty?: string;
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
  blendMode: string;
  rotation: number;
  /** 회전 밖의 변환(뒤집기·기울이기)이 있으면 true */
  hasSkewOrFlip: boolean;
  isMask: boolean;
  explicitModeCount: number;
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
  strokeAlign?: string;
  strokeWeight?: Sides<Bound>;
  dashPattern: readonly number[];
  strokeJoin?: string;
  strokeCap?: string;
  variableWidthStroke: boolean;
  complexStroke: boolean;
  radius?: Corners<Bound>;
  cornerSmoothing: number;
  effects: EffectData[] | null;
  effectStyle?: string;
  clipsContent: boolean | null;
  layout: LayoutData | null;
  child: ChildLayoutData | null;
  text: TextData | null;
  asset: AssetData | null;
  /** ELLIPSE의 호 정보. 완전한 원이면 true */
  isFullEllipse: boolean | null;
  /** 보이는 자식 */
  children: NodeData[];
  /** 숨긴 자식(숨긴 노드는 안쪽을 읽지 않는다) */
  hiddenChildren: HiddenLayer[];
};
