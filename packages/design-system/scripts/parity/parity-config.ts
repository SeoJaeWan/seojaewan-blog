// @codocs [[피그마 일치 검사:스토리 규칙]]
// 컴포넌트마다 비교에 쓰는 스토리의 이름이다(export 이름 Parity 또는 parity에서 나온다).
export const PARITY_STORY_NAME = 'Parity';
// 비교할 요소를 직접 고를 때 다는 속성이다. 없으면 #storybook-root의 첫 요소를 비교한다.
export const PARITY_TARGET_ATTRIBUTE = 'data-parity-target';
// 상호작용으로 재현하는 상태 속성 이름(정규화한 이름)이다.
export const STATE_PROPERTY = 'state';
// 스토리 렌더링과 서체 로딩을 기다리는 최대 시간(ms)이다.
export const RENDER_TIMEOUT_MS = 15_000;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 레이어와 짝짓는 속성이다. 값은 레이어 경로다.
export const FIGMA_LAYER_ATTRIBUTE = 'data-figma';
// 피그마 변형 루트와 짝짓는 요소가 비교 요소(data-parity-target)와 다를 때 단다.
export const FIGMA_ROOT_ATTRIBUTE = 'data-figma-root';
