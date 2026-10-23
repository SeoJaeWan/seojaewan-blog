// 플러그인이 내보내는 대상과 경로. 저장소와 기준 브랜치는 고정이다.

/** 내보내는 피그마 파일 키 */
export const FILE_KEY = 'XV9Y1UT5UH4tC5hSqLVipZ';

/** 컴포넌트가 있는 "01 · Components" 페이지 */
export const COMPONENTS_PAGE_ID = '1:2';

/** PNG 내보내기 배율. figma.json에 함께 기록한다. */
export const SCALE = 1;

export const REPO_OWNER = 'SeoJaeWan';
export const REPO_NAME = 'seojaewan-blog';
export const BASE_BRANCH = 'main';
/** main에 병합된 컴포넌트의 현재 구현 캡처를 두는 브랜치(CI가 쓴다). PR 본문 "현재 구현" 열이 여기를 가리킨다 */
export const CAPTURES_BRANCH = 'parity-captures';

/** 디자인 시스템 패키지의 피그마 기준 자료 폴더 */
export const FIGMA_DIR = 'packages/design-system/figma';
export const TOKENS_PATH = `${FIGMA_DIR}/tokens.json`;
/** tokens.json에서 변환 함수로 만드는 생성 파일 */
export const TOKENS_CSS_PATH = 'packages/design-system/src/tokens.css';
/** 파일 키와 배율처럼 바뀌지 않는 전역 값 */
export const SETTINGS_PATH = `${FIGMA_DIR}/figma.json`;
/** 컴포넌트마다 export.json과 변형 PNG를 두는 폴더 */
export const COMPONENTS_DIR = `${FIGMA_DIR}/components`;

/** GitHub 토큰을 보관하는 figma.clientStorage 키 */
export const TOKEN_STORAGE_KEY = 'github-token';

/** 자산(아이콘·도형·일러스트·이미지)을 묶음별로 두는 폴더 */
export const ASSETS_DIR = `${FIGMA_DIR}/assets`;
