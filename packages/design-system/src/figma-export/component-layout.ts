import type {
  CubicBezier,
  EasingType,
  MotionProperty,
  MotionValue,
  Sides,
} from './component-schema';
import type { LayerKey } from './layer-key';

// 검증 자료(`src/components/<이름>/<이름>.layout.json`)의 꼴이다. 플러그인이 쓰고 스토리 테스트만 읽는다.
// 생성 스크립트는 읽지 않는다. 플러그인은 피그마가 돌려준 최종 값을 단위만 바꿔 적고, 계산하거나 추론하지 않는다.
// 피그마가 최종 값을 주지 않는 항목(그라데이션 방향 등)은 넣지 않는다.

/** 검증 자료 꼴의 판. 스키마의 판과 함께 올린다 */
export const COMPONENT_LAYOUT_VERSION = 1;

/**
 * 컴포넌트 하나의 검증 자료.
 * - name: 피그마 컴포넌트(세트) 이름. 스키마의 name과 같다
 * - variants: 스키마의 변형과 같은 순서·같은 이름의 변형별 값
 * @codocs [[디자인 시스템:생성 결과 검증]]
 */
export type ComponentLayout = {
  formatVersion: typeof COMPONENT_LAYOUT_VERSION;
  name: string;
  variants: VariantLayout[];
};

/**
 * 변형 하나에서 피그마가 계산한 값.
 * - name: 변형 이름(`VariantSchema.name`)
 * - width, height: 변형 루트의 크기
 * - layers: 보이는 레이어마다 값. 키는 스키마와 같은 레이어 키이고 루트는 빈 문자열이다. 숨긴 레이어는 넣지 않는다.
 *   인스턴스 안쪽의 보이는 레이어도 넣고(키는 인스턴스 키 뒤에 잇는다), 자산 안쪽 레이어는 넣지 않는다
 * - motion: 이 변형에서 도는 키프레임. 스키마의 `motion`과 같은 순서다. 없으면 빈 목록
 * @codocs [[디자인 시스템:생성 결과 검증]]
 */
export type VariantLayout = {
  name: string;
  width: number;
  height: number;
  layers: Record<LayerKey, LayerMeasure>;
  motion: MotionTimelineLayout[];
};

/**
 * 색. 네 채널을 0~255로 옮긴 것이다. a는 그 색 자신의 투명도이고, 칠 불투명도는 칠의 opacity에 따로 있다.
 * 피그마 단색 칠의 색에는 투명도가 없어 a는 255다(색 변수의 투명도는 피그마가 칠 불투명도로 옮긴다).
 */
export type Rgba255 = { r: number; g: number; b: number; a: number };

/**
 * 레이어 하나의 값.
 * - x, y, width, height: 변형 왼쪽 위 기준 자리와 크기(`absoluteBoundingBox`에서 변형의 것을 뺀 값)
 * - opacity: 레이어 불투명도(0~1)
 * - fills: 보이는 칠. 피그마 순서(아래에서 위)다. 글자 레이어에서는 글자색이다
 * - stroke: 보이는 선. 없으면 null
 * - cornerRadius: 모서리마다 반경. 모서리가 없는 레이어(글자)는 null
 * - shadows: 그림자. 효과 스타일을 푼 값이다
 * - text: 글자 레이어의 글자 값. 글자가 아니면 null
 * - asset: 자산 인스턴스이면 어느 자산과 색인지. 아니면 null
 */
export type LayerMeasure = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  fills: MeasuredPaint[];
  stroke: MeasuredStroke | null;
  cornerRadius: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  } | null;
  shadows: MeasuredShadow[];
  text: MeasuredText | null;
  asset: MeasuredAsset | null;
};

/**
 * 칠 하나.
 * - opacity: 칠 불투명도(0~1)
 * - GRADIENT_*.stops: 색 단계. position은 0~1이다. 방향은 피그마가 최종 값을 주지 않아 넣지 않는다
 * - IMAGE.fit: 이미지 칠의 맞춤 방식을 CSS 이름으로 옮긴 것(`FILL`은 `cover`, `FIT`은 `contain`)
 */
export type MeasuredPaint =
  | { type: 'SOLID'; color: Rgba255; opacity: number }
  | {
      type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
      stops: { position: number; color: Rgba255 }[];
      opacity: number;
    }
  | { type: 'IMAGE'; fit: 'cover' | 'contain'; opacity: number };

/**
 * 선.
 * - weight: 변마다 두께(px)
 * - align: 피그마 선 위치. 테스트가 어느 CSS(테두리, 안쪽 고리, outline)와 견줄지 고르는 데 쓴다
 */
export type MeasuredStroke = {
  paints: MeasuredPaint[];
  weight: Sides<number>;
  align: 'INSIDE' | 'OUTSIDE' | 'CENTER';
};

/** 그림자 하나. offsetX·offsetY·radius·spread는 px다 */
export type MeasuredShadow = {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: Rgba255;
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
};

/**
 * 글자 값.
 * - fontSize: 글자 크기(px)
 * - lineHeight: 줄 높이. 피그마 단위 그대로다(`AUTO`는 피그마가 숫자를 주지 않는다)
 * - fontWeight: 굵기(숫자)
 * - autoResize: `textAutoResize`. 내용에 맞춰지는 글자(`WIDTH_AND_HEIGHT`)는 테스트가 폭을 이 자료의 값으로 고정하고 견준다
 */
export type MeasuredText = {
  fontSize: number;
  lineHeight:
    { unit: 'PIXELS'; value: number } | { unit: 'PERCENT'; value: number } | { unit: 'AUTO' };
  fontWeight: number;
  autoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
};

/**
 * 자산 인스턴스의 값. 자산 안쪽 그림은 견주지 않는다.
 * - file: 자산 원본 파일 이름(`AssetRef.file`)
 * - color: 한 가지 색 자산에 칠한 색. 여러 색과 이미지 자산은 null
 */
export type MeasuredAsset = { file: string; color: Rgba255 | null };

/**
 * 타임라인 하나의 키프레임. 스키마의 `MotionTimeline`을 단위만 바꾼 것이다.
 * - durationMs: 타임라인 길이(밀리초)
 * - isLooping: 재생 설정 Loop. 켜면 무한 반복, 끄면 한 번이다
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:모션]]
 */
export type MotionTimelineLayout = {
  owner: { kind: 'variant' } | { kind: 'asset'; layer: LayerKey };
  isLooping: boolean;
  durationMs: number;
  tracks: MotionTrackLayout[];
};

/**
 * 트랙 하나. 값의 단위는 테스트가 `getAnimations()`로 읽는 값과 같게 바꾼다.
 * - ROTATION: 부호를 뒤집어 CSS 방향(시계 방향이 +)으로 적는다
 * - PATH_TRIM_START, PATH_TRIM_END: 선 길이를 1로 본 비율로 적는다
 * - 그 밖의 항목은 피그마 값 그대로다(이동은 px)
 * - operation, baseValue: 스키마와 같다. 단위는 위처럼 바꾼다
 */
export type MotionTrackLayout = {
  layer: LayerKey;
  assetLayer: string | null;
  property: MotionProperty;
  operation: 'SET' | 'OFFSET' | 'SCALE';
  baseValue: MotionValue;
  keyframes: { offsetMs: number; value: MotionValue; easing: MeasuredEasing }[];
};

/** 이징. 피그마가 준 종류와 곡선 숫자 그대로다. 곡선 숫자가 없으면 bezier가 null이다 */
export type MeasuredEasing = { type: EasingType; bezier: CubicBezier | null };

/**
 * 생성기가 컴포넌트마다 내는 레이어 짝 표. 레이어 키 → 그 레이어를 그린 요소를 찾는 CSS 선택자(스토리 루트 기준)다.
 * 스토리 테스트만 읽는다. 요소에 검사용 속성을 붙이지 않고 생성기가 레이어의 자리로 지은 클래스로 짝짓는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:스토리 규칙]]
 */
export type LayerPairTable = Readonly<Record<LayerKey, string>>;
