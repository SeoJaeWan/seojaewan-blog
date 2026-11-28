import type { LayerKey } from './layer-key';

// 컴포넌트 스키마(`src/components/<이름>/<이름>.json`)의 꼴이다. 플러그인이 쓰고 생성 스크립트가 읽는다.
// 스키마에는 피그마의 사실을 피그마의 이름과 단위 그대로 적는다(색 0~1, 시간 초, 회전은 반시계 방향이 +).
// CSS나 클래스 이름, 코드 입력 이름으로 풀어 적지 않는다. 그렇게 옮기는 규칙은 생성 스크립트에만 둔다.
// 이 파일은 타입만 가져온다. 플러그인(esbuild)과 생성 스크립트(Node)가 함께 읽기 때문이다.

/** 스키마 꼴의 판. 꼴을 바꾸면 올리고 플러그인과 생성 스크립트를 함께 고친다 */
export const COMPONENT_SCHEMA_VERSION = 1;

/** 상태 변형 축의 이름([[디자인 시스템:상태]]). 값은 공백으로 쪼갠 낱말로 읽는다 */
export const STATE_AXIS = 'State';

/** 기기 변형 축의 이름([[디자인 시스템:기기 변형]]). 입력으로 내지 않고 미디어 쿼리로 낸다 */
export const DEVICE_AXIS = 'Device';

/** `Device` 축의 기본 값. 이 값의 변형을 기본으로 내고 다른 값은 차이만 미디어 쿼리에 낸다 */
export const DEVICE_DEFAULT_VALUE = 'Desktop';

/** 움직임 변형 축의 이름([[디자인 시스템:모션 견본]]) */
export const MOTION_AXIS = 'Motion';

/** `Motion` 축에서 가만히 있는 모습의 값 */
export const MOTION_NONE_VALUE = 'None';

/** 컴포넌트를 통째로 움직이는 키프레임을 거는, 내용 전체를 감싼 레이어 이름. 생성기는 이 레이어를 코드에 만들지 않는다 */
export const MOTION_WRAPPER_LAYER = 'motion';

/**
 * 컴포넌트 하나(컴포넌트 세트, 또는 변형이 없는 컴포넌트)의 스키마.
 * - name: 피그마 컴포넌트(세트) 이름(`Button`)
 * - nodeId: 컴포넌트 세트나 단독 컴포넌트의 노드 ID
 * - page: 컴포넌트가 놓인 페이지
 * - description: 컴포넌트 설명 칸의 평문. 없으면 빈 문자열
 * - behavior: `Interaction` 분류 Dev Mode 주석에 적힌 동작의 종류 이름(`button`). 그림뿐인 컴포넌트는 null이다
 * - properties: 컴포넌트 속성 정의. 피그마 순서다. 변형 축도 `VARIANT` 속성으로 여기 있다
 * - variants: 변형마다 전체 모습. 피그마 순서다. 변형이 없는 컴포넌트는 변형 하나다
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:동작의 종류]]
 */
export type ComponentSchema = {
  formatVersion: typeof COMPONENT_SCHEMA_VERSION;
  name: string;
  nodeId: string;
  page: ComponentPage;
  description: string;
  behavior: string | null;
  properties: PropertyDefinition[];
  variants: VariantSchema[];
};

/** 컴포넌트를 내보내는 페이지([[디자인 시스템:내보낼 대상]]) */
export type ComponentPage = 'Controls' | 'Shell' | 'Blog';

/**
 * 컴포넌트 속성 정의 하나(`componentPropertyDefinitions`의 항목).
 * - key: 피그마 속성 키. `VARIANT`는 이름 그대로이고 나머지는 `#id`가 붙는다(`Label#12:0`). 레이어의 `propertyRefs`가 이 키를 가리킨다
 * - name: `#id`를 뗀 속성 이름(`Label`). 코드 입력 이름은 생성기가 이 이름에서 만든다
 * - options: `VARIANT`의 값. 피그마 순서다
 * - default: 기본값(`defaultValue`). `INSTANCE_SWAP`은 기본 인스턴스의 원본이다
 * - isOnByDefault: `BOOLEAN`의 기본값(`defaultValue`)
 * - preferredValues: 선호값(preferred values). 그 자리에 쓸 수 있는 원본이다
 * - description: `SLOT` 속성의 설명. 없으면 빈 문자열
 * - settings: `SLOT` 속성의 슬롯 설정
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 */
export type PropertyDefinition =
  | { type: 'VARIANT'; key: string; name: string; options: string[]; default: string }
  | { type: 'BOOLEAN'; key: string; name: string; isOnByDefault: boolean }
  | { type: 'TEXT'; key: string; name: string; default: string }
  | {
      type: 'INSTANCE_SWAP';
      key: string;
      name: string;
      default: ComponentRef;
      preferredValues: ComponentRef[];
    }
  | {
      type: 'SLOT';
      key: string;
      name: string;
      description: string;
      preferredValues: ComponentRef[];
      settings: SlotSettings;
    };

/**
 * 슬롯 설정(`SlotSettings`)을 우리 이름으로 옮긴 것.
 * - minChildren, maxChildren: 자식 수 제한. 없으면 null
 * - shouldStretchChildOnInsert: `stretchChildOnInsert`
 * - isEmptyByDefault: `displayEmptyByDefault`
 * - isPreferredValuesOnly: `allowPreferredValuesOnly`
 */
export type SlotSettings = {
  minChildren: number | null;
  maxChildren: number | null;
  shouldStretchChildOnInsert: boolean;
  isEmptyByDefault: boolean;
  isPreferredValuesOnly: boolean;
};

/**
 * 원본 컴포넌트를 가리키는 참조. 인스턴스 교체 속성의 기본값·선호값과 인스턴스의 교체 값에 쓴다.
 * - asset: Foundations 자산 컴포넌트
 * - component: 내보내는 컴포넌트. name은 컴포넌트(세트) 이름, values는 고른 변형의 축 값(세트를 통째로 가리키거나 단독 컴포넌트면 빈 객체)
 */
export type ComponentRef =
  | { kind: 'asset'; asset: AssetRef }
  | { kind: 'component'; name: string; values: Record<string, string> };

/**
 * 자산 컴포넌트 참조([[디자인 시스템:자산]]).
 * - group: 원본이 놓인 구역으로 정한 자산 묶음
 * - name: 피그마 자산 컴포넌트 이름 그대로(`ic_fluent_add_20_regular`, `progress-ring/Arc`)
 * - file: 플러그인이 쓴 자산 원본 파일의 `src/assets/` 기준 경로에서 확장자를 뺀 것(`icons/ic_fluent_add_20_regular`). 코드가 자산을 찾는 이름이다
 */
export type AssetRef = { group: AssetGroup; name: string; file: string };

/** 자산 묶음([[디자인 시스템:자산]]) */
export type AssetGroup = 'Icons' | 'Shapes' | 'Illustrations' | 'Images';

/**
 * 변형 하나의 전체 모습. 기본 변형과의 차이로 적지 않는다.
 * - name: 피그마 변형 이름(`Variant=Accent, State=Rest`). 변형이 없는 컴포넌트는 컴포넌트 이름이다. 검증 자료의 변형과 이 이름으로 짝짓는다
 * - nodeId: 변형(컴포넌트) 노드 ID
 * - values: 변형 축 이름 → 값(피그마 글자 그대로). 변형이 없는 컴포넌트는 빈 객체
 * - root: 변형 루트 레이어(`COMPONENT`). 키는 빈 문자열이다
 * - transitions: 이 변형에서 다른 변형으로 걸린 전환. 계기(누르면, 올리면)는 읽지 않는다
 * - motion: 이 변형에서 도는 키프레임. 없으면 빈 목록
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:상태]]
 */
export type VariantSchema = {
  name: string;
  nodeId: string;
  values: Record<string, string>;
  root: BoxLayer;
  transitions: VariantTransition[];
  motion: MotionTimeline[];
};

/**
 * 변형 사이 전환 하나(`reactions`의 `CHANGE_TO` 항목).
 * - destination: 도착 변형 이름(`VariantSchema.name`)
 * - transition: 전환 움직임. 바로 바뀌면 null
 * @codocs [[디자인 시스템:상태]]
 */
export type VariantTransition = {
  destination: string;
  transition: TransitionMotion | null;
};

/**
 * 전환 움직임(`Transition`).
 * - type: 피그마 전환 종류
 * - duration: 길이(초)
 */
export type TransitionMotion = {
  type:
    | 'DISSOLVE'
    | 'SMART_ANIMATE'
    | 'SCROLL_ANIMATE'
    | 'MOVE_IN'
    | 'MOVE_OUT'
    | 'PUSH'
    | 'SLIDE_IN'
    | 'SLIDE_OUT';
  duration: number;
  easing: Easing;
};

/**
 * 이징. type은 피그마 이징 종류이고, bezier는 피그마가 준 곡선 네 숫자(`easingFunctionCubicBezier`)다.
 * 피그마가 곡선 숫자를 주지 않는 종류(곡선 이름만 있는 것, 스프링, `HOLD`)는 bezier가 null이다.
 * @codocs [[디자인 시스템:모션]]
 */
export type Easing = {
  type: EasingType;
  bezier: CubicBezier | null;
};

/** 피그마 이징 종류(`MotionEasing.type`). `HOLD`는 키프레임 이징에만 있다 */
export type EasingType =
  | 'LINEAR'
  | 'EASE_IN'
  | 'EASE_OUT'
  | 'EASE_IN_AND_OUT'
  | 'EASE_IN_BACK'
  | 'EASE_OUT_BACK'
  | 'EASE_IN_AND_OUT_BACK'
  | 'CUSTOM_CUBIC_BEZIER'
  | 'GENTLE'
  | 'QUICK'
  | 'BOUNCY'
  | 'SLOW'
  | 'CUSTOM_SPRING'
  | 'HOLD';

/** 3차 베지어 곡선의 두 손잡이 */
export type CubicBezier = { x1: number; y1: number; x2: number; y2: number };

/**
 * 재생 설정 하나를 갖는 타임라인과 그 안의 키프레임 트랙.
 * - owner: 재생 설정(Loop)과 타임라인을 가진 노드. variant는 이 변형이고, asset은 그 키의 자산 인스턴스가 가리키는 자산 원본이다
 * - isLooping: 재생 설정 Loop. 켜면 무한, 끄면 한 번이다
 * - duration: 타임라인 길이(초)
 * @codocs [[디자인 시스템:모션 견본]]
 * @codocs [[디자인 시스템:모션]]
 */
export type MotionTimeline = {
  owner: { kind: 'variant' } | { kind: 'asset'; layer: LayerKey };
  isLooping: boolean;
  duration: number;
  tracks: MotionTrack[];
};

/**
 * 레이어 하나의 항목 하나에 걸린 키프레임 트랙.
 * - layer: 키프레임이 걸린 레이어. 자산 원본에 걸린 것은 그 자산 인스턴스의 키다
 * - assetLayer: 자산 원본 안에서 키프레임이 걸린 레이어의 경로(레이어 키 규칙). 자산이 아니면 null, 자산 원본 루트면 빈 문자열
 * - property: 피그마 키프레임 항목
 * - operation: 피그마 트랙 연산(`keyframeOperation`)
 * - baseValue: 키프레임 기본값(멈춘 모습)
 * - keyframes: 시간순 키프레임
 */
export type MotionTrack = {
  layer: LayerKey;
  assetLayer: string | null;
  property: MotionProperty;
  operation: 'SET' | 'OFFSET' | 'SCALE';
  baseValue: MotionValue;
  keyframes: MotionKeyframe[];
};

/** 옮기는 키프레임 항목([[디자인 시스템:모션]]의 표). 다른 항목은 구조 검사가 막는다 */
export type MotionProperty =
  | 'OPACITY'
  | 'SCALE_XY'
  | 'SCALE_X'
  | 'SCALE_Y'
  | 'TRANSLATION_XY'
  | 'TRANSLATION_X'
  | 'TRANSLATION_Y'
  | 'ROTATION'
  | 'PATH_TRIM_START'
  | 'PATH_TRIM_END';

/** 키프레임 값. `_XY` 항목은 `{ x, y }`, 나머지는 숫자다 */
export type MotionValue = number | { x: number; y: number };

/**
 * 키프레임 하나.
 * - time: 타임라인 위치(초, `timelinePosition`)
 * - easing: 이전 키프레임에서 이 키프레임까지의 곡선. 첫 키프레임의 것은 쓰지 않는다
 */
export type MotionKeyframe = {
  time: number;
  value: MotionValue;
  easing: Easing;
};

/**
 * 변수에 연결할 수 있는 값. 연결했으면 변수만, 아니면 피그마 값 그대로다. 가까운 토큰으로 바꿔 적지 않는다.
 * @codocs [[디자인 시스템:스키마]]
 */
export type Bindable<T> = { variable: VariableRef } | { value: T };

/**
 * 변수 참조.
 * - collection: 변수 컬렉션 이름(`Color`, `Dimension`, `Typography`). 색의 CSS 이름 앞마디가 된다
 * - name: 피그마 변수 이름(`Black/60`, `spacing/sm`)
 */
export type VariableRef = { collection: string; name: string };

/** 피그마 색. 네 채널 모두 0~1이다 */
export type FigmaRgba = { r: number; g: number; b: number; a: number };

/** 네 변(위, 오른쪽, 아래, 왼쪽)마다의 값 */
export type Sides<T> = { top: T; right: T; bottom: T; left: T };

/** 네 모서리마다의 값 */
export type Corners<T> = { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T };

/**
 * 칠 목록. 칠 스타일에 연결했으면 스타일 이름만, 아니면 보이는 칠을 피그마 순서(아래에서 위)로 적는다. 숨긴 칠은 적지 않는다.
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:자산]]
 */
export type Paints = { style: string } | { paints: Paint[] };

/**
 * 칠 하나. 그라데이션은 칠 스타일로만 쓰므로(구조 검사) 여기 없다.
 * - SOLID.color: 색. 색 변수를 연결하면 피그마는 변수의 투명도를 칠 불투명도로 옮긴다
 * - SOLID.opacity: 칠 불투명도(0~1)
 * - IMAGE.scaleMode: 이미지 칠의 맞춤 방식. `CROP`·`TILE`은 구조 검사가 막는다
 * - IMAGE.asset: 이미지 해시로 찾은 Images 자산
 */
export type Paint =
  | { type: 'SOLID'; color: Bindable<FigmaRgba>; opacity: number }
  | { type: 'IMAGE'; scaleMode: 'FILL' | 'FIT'; opacity: number; asset: AssetRef };

/**
 * 선.
 * - weight: 변마다 두께
 * - align: 피그마 선 위치(`strokeAlign`)
 * - isIncludedInLayout: 선이 레이아웃에 들어가는지(strokes included in layout)
 * @codocs [[디자인 시스템:컨트롤 테두리 구현]]
 */
export type Stroke = {
  paints: Paints;
  weight: Sides<Bindable<number>>;
  align: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  isIncludedInLayout: boolean;
};

/**
 * 자동 배치(`layoutMode`가 `NONE`이 아닌 프레임).
 * - counterAxisAlignContent, counterAxisSpacing: 줄바꿈(`WRAP`)일 때의 줄 정렬과 줄 간격. 줄바꿈이 아니면 counterAxisSpacing은 null
 * - isReversingZIndex: `itemReverseZIndex`
 * 주축·교차축의 크기 방식은 레이어의 `sizing`에 있다.
 */
export type AutoLayout = {
  mode: 'HORIZONTAL' | 'VERTICAL';
  wrap: 'NO_WRAP' | 'WRAP';
  primaryAxisAlign: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlign: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignContent: 'AUTO' | 'SPACE_BETWEEN';
  padding: Sides<Bindable<number>>;
  itemSpacing: Bindable<number>;
  counterAxisSpacing: Bindable<number> | null;
  isReversingZIndex: boolean;
};

/**
 * 부모 안에 놓인 방식. 변형 루트에는 없다.
 * - positioning: `layoutPositioning`. 자동 배치가 아닌 부모의 자식은 언제나 `AUTO`이고 제약으로 놓인다
 * - constraints: 제약. 절대 위치이거나 부모가 자동 배치가 아닐 때 쓴다([[디자인 시스템:겹쳐 놓기]])
 * - x, y: 부모 기준 위치(피그마 `x`, `y`. `relativeTransform`의 이동 값이다)
 */
export type Placement = {
  positioning: 'AUTO' | 'ABSOLUTE';
  constraints: {
    horizontal: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
  };
  x: number;
  y: number;
};

/** 레이어 크기 방식(`layoutSizingHorizontal`·`layoutSizingVertical`) */
export type LayerSizing = 'FIXED' | 'HUG' | 'FILL';

/**
 * 모든 레이어가 갖는 것.
 * - key: 레이어 키([[디자인 시스템:생성 결과 검증]]). 검증 자료와 짝 표가 이 키를 쓴다
 * - name: 레이어 이름
 * - nodeId: 레이어 노드 ID(인스턴스 안쪽이면 피그마의 인스턴스 안 ID)
 * - isVisible: 보이는지. 숨긴 레이어도 적고, 숨긴 레이어는 켜고 끄는 속성(`propertyRefs.visible`)에 묶여 있다
 * - propertyRefs: 이 레이어에 연결된 컴포넌트 속성의 키(`componentPropertyReferences`). visible은 불리언, characters는 글자, mainComponent는 인스턴스 교체 속성이다
 * - width, height: 피그마 크기. 고정 크기 축에서 변수에 연결했으면 변수다
 * - sizing: 가로·세로 크기 방식
 * - minWidth, maxWidth, minHeight, maxHeight: 최소·최대 크기. 없으면 null
 * - aspectRatio: 잠근 비율(너비 ÷ 높이, `targetAspectRatio`). 잠그지 않았으면 null
 * - placement: 부모 안에 놓인 방식. 변형 루트는 null
 * - rotation: 회전(도). 피그마 값 그대로라 반시계 방향이 +다([[디자인 시스템:회전 구현]])
 * - opacity: 레이어 불투명도(0~1)
 */
export type LayerBase = {
  key: LayerKey;
  name: string;
  nodeId: string;
  isVisible: boolean;
  propertyRefs: { visible?: string; characters?: string; mainComponent?: string };
  width: Bindable<number>;
  height: Bindable<number>;
  sizing: { horizontal: LayerSizing; vertical: LayerSizing };
  minWidth: Bindable<number> | null;
  maxWidth: Bindable<number> | null;
  minHeight: Bindable<number> | null;
  maxHeight: Bindable<number> | null;
  aspectRatio: number | null;
  placement: Placement | null;
  rotation: number;
  opacity: Bindable<number>;
};

/**
 * 칠·선·모서리·효과를 갖는 레이어의 모습.
 * - fills: 칠. 칠이 없으면 `{ paints: [] }`
 * - stroke: 선. 보이는 선이 없으면 null
 * - cornerRadius: 모서리마다 반경. 둥글지 않으면 모두 0이다
 * - effectStyle: 효과 스타일 이름. 효과는 효과 스타일로만 쓴다(구조 검사). 없으면 null
 */
export type Appearance = {
  fills: Paints;
  stroke: Stroke | null;
  cornerRadius: Corners<Bindable<number>>;
  effectStyle: string | null;
};

/**
 * 틀 레이어(프레임, 변형 루트 컴포넌트, 그룹, 사각형).
 * - layout: 자동 배치. 자동 배치가 아니면 null
 * - isClippingContent: 내용 자르기(`clipsContent`)
 * - overflowDirection: 프레임 스크롤 방향
 * - children: 자식 레이어. 피그마 `children` 순서이고 숨긴 레이어도 담는다
 */
export type BoxLayer = LayerBase &
  Appearance & {
    kind: 'box';
    figmaType: 'COMPONENT' | 'FRAME' | 'GROUP' | 'RECTANGLE';
    layout: AutoLayout | null;
    isClippingContent: boolean;
    overflowDirection: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
    children: Layer[];
  };

/**
 * 슬롯 레이어(SLOT 노드). 틀 레이어와 같은 것을 갖고, children은 슬롯의 기본 내용이다.
 * - slotProperty: 이 슬롯의 `SLOT` 속성 키
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 */
export type SlotLayer = Omit<BoxLayer, 'kind' | 'figmaType'> & {
  kind: 'slot';
  figmaType: 'SLOT';
  slotProperty: string;
};

/**
 * 글자 레이어. 글꼴 구간은 적지 않는다.
 * - characters: 기본 글자
 * - textStyle: 글자 스타일 이름(`Body`). 글자는 스타일로만 쓴다(구조 검사)
 * - autoResize: `textAutoResize`
 * - truncation: 글자 말줄임(`textTruncation`)
 * - maxLines: 최대 줄 수. 없으면 null
 * - textAlignHorizontal, textAlignVertical: 글자 정렬
 * fills가 글자색이다.
 * @codocs [[디자인 시스템:서체 구현]]
 */
export type TextLayer = LayerBase &
  Appearance & {
    kind: 'text';
    figmaType: 'TEXT';
    characters: string;
    textStyle: string;
    autoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
    truncation: 'DISABLED' | 'ENDING';
    maxLines: number | null;
    textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  };

/**
 * 품은 컴포넌트의 인스턴스. 펼치지 않고 참조로 적는다. 모습은 원본에서 오므로 적지 않는다.
 * - component: 원본 컴포넌트(세트) 이름
 * - properties: 인스턴스의 속성 값. 키는 원본의 `#id`를 뗀 속성 이름이고, 변형 축 값도 여기 있다
 * - isExposed: 중첩 인스턴스 속성 노출(`isExposedInstance`)
 * - scaleFactor: 배율. 줄이지 않았으면 1
 * - overrides: 속성으로 열리지 않은 덮어쓰기 가운데 구조 검사가 허용하는 것(자산 인스턴스의 색과 불투명도)
 * - slots: 원본의 슬롯을 이 자리에서 채운 내용. 채우지 않은 슬롯은 적지 않는다
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 */
export type InstanceLayer = LayerBase & {
  kind: 'instance';
  figmaType: 'INSTANCE';
  component: string;
  properties: Record<string, PropertyValue>;
  isExposed: boolean;
  scaleFactor: number;
  overrides: InstanceOverride[];
  slots: SlotContent[];
};

/** 인스턴스의 속성 값. `INSTANCE_SWAP`은 바꿔 끼운 원본이다 */
export type PropertyValue = string | boolean | ComponentRef;

/**
 * 인스턴스 안쪽 레이어의 덮어쓰기.
 * - layer: 원본 컴포넌트 안의 레이어 키
 * - asset-color: 자산 인스턴스의 색
 * - asset-opacity: 자산 인스턴스 전체의 불투명도
 */
export type InstanceOverride =
  | { kind: 'asset-color'; layer: LayerKey; color: Bindable<FigmaRgba> }
  | { kind: 'asset-opacity'; layer: LayerKey; opacity: Bindable<number> };

/**
 * 인스턴스의 슬롯을 채운 내용.
 * - slot: 원본 컴포넌트의 `SLOT` 속성 이름(`#id`를 뗀 것)
 * - layer: 원본 컴포넌트 안의 슬롯 레이어 키
 * - children: 채운 레이어. 키는 이 인스턴스 키 + 슬롯 레이어 키 아래로 잇는다
 */
export type SlotContent = {
  slot: string;
  layer: LayerKey;
  children: Layer[];
};

/**
 * Foundations 자산 컴포넌트의 인스턴스.
 * - asset: 어느 자산인지
 * - color: 한 가지 색 자산(Icons, Shapes)에 칠한 색. 여러 색과 이미지 자산은 null
 * - scaleMode: 이미지 자산의 이미지 칠 맞춤 방식. 이미지가 아니면 null
 * - sourceWidth, sourceHeight: 원본 자산 컴포넌트의 크기. 놓인 크기가 원본과 다를 때만 코드가 크기를 적는다
 * - scaleFactor: 배율. 줄이지 않았으면 1
 * @codocs [[디자인 시스템:자산]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 */
export type AssetLayer = LayerBase & {
  kind: 'asset';
  figmaType: 'INSTANCE';
  asset: AssetRef;
  color: Bindable<FigmaRgba> | null;
  scaleMode: 'FILL' | 'FIT' | null;
  sourceWidth: number;
  sourceHeight: number;
  scaleFactor: number;
};

/** 레이어 하나 */
export type Layer = BoxLayer | SlotLayer | TextLayer | InstanceLayer | AssetLayer;
