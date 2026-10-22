import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
// 스크립트가 다루는 디자인 시스템 패키지 경로를 한곳에 모은다.
export const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export const figmaDir = path.join(packageRoot, 'figma');
export const tokensJsonPath = path.join(figmaDir, 'tokens.json');
// 파일 키와 배율 같은 전역 값이다.
export const FIGMA_SETTINGS_FILE = 'figma.json';
// 컴포넌트마다 export.json, 변형 PNG, vector SVG를 두는 폴더 이름이다.
export const FIGMA_COMPONENTS_FOLDER = 'components';
export const COMPONENT_MANIFEST_FILE = 'export.json';

export const tokensCssPath = path.join(packageRoot, 'src', 'tokens.css');
export const storybookStaticDir = path.join(packageRoot, 'storybook-static');
export const parityResultsDir = path.join(packageRoot, 'parity-results');

// 웹 폰트 패키지 폴더다. generate:fonts가 이 패키지들의 CSS에서 woff2만 가리키는 CSS를 src/에 만든다.
export const nodeModulesDir = path.join(packageRoot, 'node_modules');
export const sourceDir = path.join(packageRoot, 'src');

// 피그마 자산(figma/assets/)과 코드가 쓰는 자산(src/assets/)이다. generate:assets가 앞에서 뒤를 만든다.
export const figmaAssetsDir = path.join(figmaDir, 'assets');
export const sourceAssetsDir = path.join(sourceDir, 'assets');
export const assetDataPath = path.join(sourceAssetsDir, 'asset-data.ts');
