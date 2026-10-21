// @codocs [[미결 사항:피그마 일치 허용 오차]]
// 피그마 일치 비교 기준이다. 검증 중인 값이라 이 세 값만 바꿔 기준을 조정한다.
// 가장 엄격한 기준으로 시작한다: 색 차이 0, 다른 픽셀 0개, 안티앨리어싱 픽셀은 차이에서 뺀다.
export const PIXELMATCH_THRESHOLD = 0;
export const SHOULD_INCLUDE_ANTI_ALIASING = false;
export const MAX_DIFF_PIXELS = 0;

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
