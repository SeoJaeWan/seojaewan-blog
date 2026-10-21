// @codocs [[피그마 일치 검사:값 비교]]
// 값 비교 허용 오차다. 위치·크기(글리프 잉크 영역 포함)는 피그마가 소수 위치에 두는 글자와 반올림 차이를 위해 ±0.5px,
// 반경·여백·간격·선 두께·글자 크기 같은 값은 사실상 같아야 하므로 부동소수 오차만 허용한다.
export const GEOMETRY_TOLERANCE = 0.5;
export const VALUE_TOLERANCE = 0.01;
export const OPACITY_TOLERANCE = 0.005;
// 글리프 잉크의 세로 위치만 1.25px까지 허용한다. Chromium은 서체의 어센트·디센트를 정수 px로 반올림해 기준선을 놓아,
// 같은 글자도 피그마보다 최대 약 1px 위아래로 그려진다(12px/16px 캡션 1.03px, 14px/20px 본문 0.43px).
// 글자 요소 상자의 세로 위치는 그대로 ±0.5px로 비교하므로 줄 높이·여백 실수는 상자 비교가 잡는다.
export const TEXT_BASELINE_TOLERANCE = 1.25;

// @codocs [[피그마 일치 검사:픽셀 비교]]
// 이미지 전체 픽셀 비교는 큰 깨짐(요소가 빠짐, 상태 색이 통째로 다름)만 잡는 느슨한 안전망이다.
// CI(Linux)에서 정상 48개 변형의 다른 픽셀 비율은 threshold 0.1에서 최대 0.90%였다. 그 위로 여유를 둔다.
export const PIXEL_THRESHOLD = 0.1;
export const SHOULD_INCLUDE_ANTI_ALIASING = false;
export const MAX_DIFF_RATIO = 0.015;

// @codocs [[피그마 일치 검사:벡터 비교]]
// vector 레이어는 피그마 SVG와 코드 요소를 같은 Chromium에서 그려 비교한다. 피그마가 원호를 베지어로 바꾸고 좌표를
// 반올림해 같은 아이콘도 가장자리 픽셀이 조금 다르다(채널 차이 최대 45, 16 넘는 픽셀 최대 2.7%).
// 다른 아이콘·굵기·0.25px 이동은 16 넘는 픽셀이 9% 이상이라, 채널 차이 16을 넘는 픽셀 비율 4%를 기준으로 둔다.
export const VECTOR_CHANNEL_THRESHOLD = 16;
export const VECTOR_MAX_DIFF_RATIO = 0.04;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 컴포넌트마다 비교에 쓰는 스토리의 이름이다(export 이름 Parity 또는 parity에서 나온다).
export const PARITY_STORY_NAME = 'Parity';
// 비교할 요소를 직접 고를 때 다는 속성이다. 없으면 #storybook-root의 첫 요소를 비교한다.
export const PARITY_TARGET_ATTRIBUTE = 'data-parity-target';
// 상호작용으로 재현하는 상태 속성 이름(정규화한 이름)이다.
export const STATE_PROPERTY = 'state';
// 스토리 주변에 두는 빈 공간(CSS px)이다. 그림자가 잘리지 않게 renderBounds보다 넉넉히 둔다.
export const PAGE_MARGIN = 64;
// 스토리 렌더링과 서체 로딩을 기다리는 최대 시간(ms)이다.
export const RENDER_TIMEOUT_MS = 15_000;

// @codocs [[디자인 기반:재질 효과]]
// 재질 효과를 쓰는 컴포넌트는 효과를 뺀 변형(Material=Solid)만 비교한다. 정규화한 속성 이름과 값이다.
export const MATERIAL_PROPERTY = 'material';
export const COMPARED_MATERIAL = 'solid';

// @codocs [[피그마 일치 검사:CI 비교]]
// 피그마처럼 글자를 그리도록 Chromium 글꼴 렌더링을 맞춘다.
// 피그마는 힌팅 없이(글리프를 픽셀 격자에 맞추지 않고) 회색조 안티앨리어싱으로 글자를 그린다.
export const BROWSER_ARGS = ['--font-render-hinting=none', '--disable-lcd-text'] as const;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 레이어와 짝짓는 속성이다. 값은 레이어 경로(export.json layers의 path)다.
export const FIGMA_LAYER_ATTRIBUTE = 'data-figma';
// 피그마 변형 루트와 짝짓는 요소가 비교 요소(data-parity-target)와 다를 때 단다.
export const FIGMA_ROOT_ATTRIBUTE = 'data-figma-root';
// CSS로 그릴 수 없는 선(점선 등)을 SVG로 그릴 때, 그 SVG에 선 주인 레이어의 경로를 단다.
export const FIGMA_STROKE_ATTRIBUTE = 'data-figma-stroke';
