import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @codocs [[저장소 구성:구성]]
// 시나리오 케이스 도구가 읽는 저장소 경로를 한곳에 모은다.
export const toolRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const repoRoot = path.resolve(toolRoot, '..', '..');

/** 저장소 기준 앱 경로 */
export const WEB_DIR = 'apps/web';
/** 저장소 기준 행위 정의 폴더 */
export const BEHAVIORS_DIR = `${WEB_DIR}/e2e/behaviors`;
/** 코드 근거를 찾는 제품 코드 폴더(저장소 기준) */
export const productSourceDirs = [`${WEB_DIR}/src`, 'packages/design-system/src'];
/** 화면 파일(HTML·CSS·JS) 폴더 */
export const pageDir = path.join(toolRoot, 'page');
/** 정적 결과 페이지를 만드는 기본 폴더 */
export const defaultReportDir = path.join(toolRoot, 'report');
/** 정의 파일·코드 링크를 거는 GitHub 저장소 */
export const REPO_URL = 'https://github.com/SeoJaeWan/seojaewan-blog';
/** 실행해보기 결과를 두는 폴더 */
export const runsDir = path.join(toolRoot, 'runs');

/**
 * 저장소 기준 경로를 절대 경로로 바꾼다.
 * @param relative 저장소 기준 경로
 * @returns 절대 경로
 */
export function fromRepo(relative: string): string {
  return path.join(repoRoot, relative);
}
