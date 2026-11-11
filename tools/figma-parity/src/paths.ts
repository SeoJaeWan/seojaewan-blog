import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @codocs [[저장소 구성:구성]]
// 모션 검사가 읽는 저장소 경로를 한곳에 모은다. 모션 자료와 Storybook 정적 빌드만 쓴다.
export const toolRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const repoRoot = path.resolve(toolRoot, '..', '..');

/** 저장소 기준 디자인 시스템 패키지 경로 */
const DESIGN_SYSTEM_DIR = 'packages/design-system';
/** 저장소 기준 앱 경로 */
const WEB_DIR = 'apps/web';

/** 애니메이션 견본마다 `<이름>.json`이 있는 폴더(모션 시간 검사) */
export const FIGMA_MOTIONS_DIR = `${DESIGN_SYSTEM_DIR}/figma/motions`;
/** 토큰 값을 읽는 tokens.json(모션 시간 검사) */
export const FIGMA_TOKENS_PATH = `${DESIGN_SYSTEM_DIR}/figma/tokens.json`;

/** Storybook 이름 → 패키지 폴더(저장소 기준) */
export const STORYBOOK_PACKAGES = {
  'design-system': DESIGN_SYSTEM_DIR,
  web: WEB_DIR,
} as const;

export type StorybookName = keyof typeof STORYBOOK_PACKAGES;

/**
 * Storybook 정적 빌드 폴더를 구한다.
 * @param storybook Storybook 이름
 * @returns 절대 경로
 */
export function storybookStaticDir(storybook: StorybookName): string {
  return path.join(repoRoot, STORYBOOK_PACKAGES[storybook], 'storybook-static');
}

/** 결과 폴더 */
const defaultResultsDir = path.join(toolRoot, 'parity-results');
/** 모션 검사가 견본마다 결과(`<이름>.json`)를 남기는 폴더. PR 댓글이 이 결과로 표를 만든다 */
export const motionResultsDir = path.join(defaultResultsDir, 'motion');

/**
 * 저장소 기준 경로를 절대 경로로 바꾼다.
 * @param relative 저장소 기준 경로
 * @returns 절대 경로
 */
export function fromRepo(relative: string): string {
  return path.join(repoRoot, relative);
}
