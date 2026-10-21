import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
// 스크립트가 다루는 디자인 시스템 패키지 경로를 한곳에 모은다.
export const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export const figmaDir = path.join(packageRoot, 'figma');
export const tokensJsonPath = path.join(figmaDir, 'tokens.json');
export const exportJsonPath = path.join(figmaDir, 'export.json');
export const figmaImagesDir = path.join(figmaDir, 'images');

export const tokensCssPath = path.join(packageRoot, 'src', 'tokens.css');
export const storybookStaticDir = path.join(packageRoot, 'storybook-static');
export const parityResultsDir = path.join(packageRoot, 'parity-results');

export const pretendardCssPath = path.join(packageRoot, 'src', 'pretendard.css');
// pretendard 패키지의 굵기별 CSS 폴더다. 생성 파일은 이 폴더의 woff2 하위 집합을 가리킨다.
export const pretendardPackageCssDir = path.join(
  packageRoot,
  'node_modules',
  'pretendard',
  'dist',
  'web',
  'static',
);
