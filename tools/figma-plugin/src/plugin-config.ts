// 플러그인이 내보내는 대상과 경로. 저장소와 기준 브랜치는 고정이다.

/**
 * 내보내는 피그마 파일 키. 저장소에 키를 적는 파일을 따로 두지 않고 여기에만 둔다.
 * @codocs [[디자인 시스템:피그마 파일]]
 */
export const FILE_KEY = 'XV9Y1UT5UH4tC5hSqLVipZ';

export const REPO_OWNER = 'SeoJaeWan';
export const REPO_NAME = 'seojaewan-blog';
export const BASE_BRANCH = 'main';

/** 디자인 시스템 패키지 폴더와 이름. changeset의 대상이다 */
export const DESIGN_SYSTEM_DIR = 'packages/design-system';
export const DESIGN_SYSTEM_PACKAGE = '@seojaewan/design-system';

/** 토큰 원본. 생성 파일(tokens.css, token-names.ts)은 CI가 같은 폴더에 만든다 */
export const TOKENS_PATH = `${DESIGN_SYSTEM_DIR}/src/tokens/tokens.json`;
/** 컴포넌트마다 `<이름>/<이름>.json`(스키마)과 `<이름>/<이름>.layout.json`(검증 자료)을 두는 폴더 */
export const COMPONENTS_DIR = `${DESIGN_SYSTEM_DIR}/src/components`;
/** 자산 원본(SVG, 래스터)을 묶음별로 두는 폴더. 생성 파일과 함께 있다 */
export const ASSETS_DIR = `${DESIGN_SYSTEM_DIR}/src/assets`;
/** PR을 열 때 함께 올리는 changeset 폴더 */
export const CHANGESET_DIR = '.changeset';

/** 컴포넌트를 내보내는 페이지([[디자인 시스템:내보낼 대상]]) */
export const COMPONENT_PAGES = ['Controls', 'Shell', 'Blog'] as const;
/** 토큰과 자산이 있는 페이지 */
export const FOUNDATIONS_PAGE = 'Foundations';

/** GitHub 토큰을 보관하는 figma.clientStorage 키 */
export const TOKEN_STORAGE_KEY = 'github-token';
