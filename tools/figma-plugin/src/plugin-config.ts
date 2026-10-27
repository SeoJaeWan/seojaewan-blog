// 플러그인이 내보내는 대상과 경로. 저장소와 기준 브랜치는 고정이다.

/** 내보내는 피그마 파일 키 */
export const FILE_KEY = 'XV9Y1UT5UH4tC5hSqLVipZ';

/** 컴포넌트가 있는 "01 · Components" 페이지 */
export const COMPONENTS_PAGE_ID = '1:2';

/** 조립이 있는 "02 · Patterns" 페이지. 이름은 바뀔 수 있어 ID로 찾는다 */
export const PATTERNS_PAGE_ID = '517:16130';

/** PNG 내보내기 배율. figma.json에 함께 기록한다. */
export const SCALE = 1;

export const REPO_OWNER = 'SeoJaeWan';
export const REPO_NAME = 'seojaewan-blog';
export const BASE_BRANCH = 'main';

/** 디자인 시스템 패키지의 피그마 기준 자료 폴더 */
export const FIGMA_DIR = 'packages/design-system/figma';
export const TOKENS_PATH = `${FIGMA_DIR}/tokens.json`;
/** tokens.json에서 변환 함수로 만드는 생성 파일 */
export const TOKENS_CSS_PATH = 'packages/design-system/src/tokens.css';
/** 파일 키와 배율처럼 바뀌지 않는 전역 값 */
export const SETTINGS_PATH = `${FIGMA_DIR}/figma.json`;
/** 컴포넌트마다 export.json과 변형 PNG를 두는 폴더 */
export const COMPONENTS_DIR = `${FIGMA_DIR}/components`;

/** 조립마다 `<영역>/<이름>/`에 export.json과 변형 PNG를 두는 폴더(앱) */
export const PATTERNS_DIR = 'apps/web/figma/patterns';

/** GitHub 토큰을 보관하는 figma.clientStorage 키 */
export const TOKEN_STORAGE_KEY = 'github-token';

/** 자산(아이콘·도형·일러스트·이미지)을 묶음별로 두는 폴더 */
export const ASSETS_DIR = `${FIGMA_DIR}/assets`;

/** 애니메이션 견본마다 `<이름>.json`을 두는 폴더 */
export const MOTIONS_DIR = `${FIGMA_DIR}/motions`;
