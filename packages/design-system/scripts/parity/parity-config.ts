// @codocs [[피그마 일치 검사:스토리 규칙]]
// 컴포넌트마다 비교에 쓰는 스토리의 이름이다(export 이름 Parity 또는 parity에서 나온다).
export const PARITY_STORY_NAME = 'Parity';
// 상호작용으로 재현하는 상태 속성 이름(정규화한 이름)이다.
export const STATE_PROPERTY = 'state';
// 스토리 렌더링과 서체 로딩을 기다리는 최대 시간(ms)이다.
export const RENDER_TIMEOUT_MS = 15_000;

// @codocs [[피그마 일치 검사:짝짓기]]
// 피그마 레이어와 짝짓는 속성이다. 값은 레이어 경로다.
export const FIGMA_LAYER_ATTRIBUTE = 'data-figma';
// 피그마 변형 루트와 짝짓는 요소에 단다.
export const FIGMA_ROOT_ATTRIBUTE = 'data-figma-root';

// @codocs [[피그마 일치 검사:CI 비교]]
// Playwright Test가 Storybook 정적 빌드를 받는 포트다(webServer).
export const PARITY_PORT = 6107;
// run-parity.ts가 고른 컴포넌트 폴더 이름 목록(JSON 배열)을 Playwright Test에 넘기는 파일이다(parity-results/ 안).
// 실행이 끝나면 지운다. 없으면 모두 비교한다.
export const SELECTION_FILE = 'selection.json';
// 변형 결과 폴더(parity-results/<컴포넌트>/<변형>/)에 남기는 결과 파일 이름이다.
export const RESULT_FILE = 'result.json';

// @codocs [[피그마 일치 검사:판정 항목]]
// 판정 중에 요소에 임시로 붙이는 번호 속성이다. CDP로 이긴 선언을 읽을 요소를 찾을 때 쓴다.
export const PARITY_NODE_ATTRIBUTE = 'data-parity-node';
// 서체를 확인하려고 글자 하나씩 감싼 span에 붙이는 번호 속성이다.
export const PARITY_CHAR_ATTRIBUTE = 'data-parity-char';
