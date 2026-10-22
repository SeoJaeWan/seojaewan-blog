// 플러그인이 내보내는 대상과 경로. 저장소와 기준 브랜치는 고정이다.

/** 내보내는 피그마 파일 키 */
export const FILE_KEY = 'XV9Y1UT5UH4tC5hSqLVipZ';

/** 컴포넌트가 있는 "01 · Components" 페이지 */
export const COMPONENTS_PAGE_ID = '1:2';

/** PNG 내보내기 배율. export.json에 함께 기록한다. */
export const SCALE = 1;

export const REPO_OWNER = 'SeoJaeWan';
export const REPO_NAME = 'seojaewan-blog';
export const BASE_BRANCH = 'main';

const FIGMA_DIR = 'packages/design-system/figma';
export const TOKENS_PATH = `${FIGMA_DIR}/tokens.json`;
/** 파일 키와 배율처럼 바뀌지 않는 전역 값 */
export const SETTINGS_PATH = `${FIGMA_DIR}/figma.json`;
/** 컴포넌트마다 export.json, 변형 PNG, vector SVG를 두는 폴더 */
export const COMPONENTS_DIR = `${FIGMA_DIR}/components`;

/** GitHub 토큰을 보관하는 figma.clientStorage 키 */
export const TOKEN_STORAGE_KEY = 'github-token';

/** 마지막으로 쓴 기존 브랜치를 보관하는 figma.clientStorage 키 */
export const BRANCH_STORAGE_KEY = 'export-branch';

/** 자산(아이콘·도형·일러스트·이미지)을 묶음별로 두는 폴더 */
export const ASSETS_DIR = `${FIGMA_DIR}/assets`;
