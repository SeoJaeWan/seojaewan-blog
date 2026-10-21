import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

import {
  exportJsonPath,
  figmaImagesDir,
  packageRoot,
  parityResultsDir,
  storybookStaticDir,
} from '../package-paths.ts';
import {
  changedExportComponents,
  componentDependents,
  selectAffectedComponents,
} from './affected-components.ts';
import { captureStory } from './capture-story.ts';
import { compareImages, readPng, writePng } from './compare-images.ts';
import type { ParityCase } from './figma-export.ts';
import { isComparedVariant, parseFigmaExport, pixelClip } from './figma-export.ts';
import {
  BROWSER_ARGS,
  MAX_DIFF_PIXELS,
  PIXELMATCH_THRESHOLD,
  SHOULD_INCLUDE_ANTI_ALIASING,
} from './parity-config.ts';
import { startStaticServer } from './static-server.ts';
import { findParityStoryId } from './story-target.ts';

// 사용법: node scripts/parity/run-parity.ts [--affected] [--base <ref>] [--no-build] [--component <name>]...
const AFFECTED_FLAG = '--affected';
const BASE_FLAG = '--base';
const NO_BUILD_FLAG = '--no-build';
const COMPONENT_FLAG = '--component';
const DEFAULT_BASES = ['origin/main', 'main'] as const;

type CaseResult = {
  component: string;
  variant: string;
  status: 'pass' | 'fail';
  message: string;
};

await main();

/**
 * 피그마 이미지와 Storybook 스토리 스크린샷을 비교하고 결과를 요약한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (!existsSync(exportJsonPath)) {
    console.log('[parity] figma/export.json이 아직 없어 피그마 일치 검사를 건너뛴다.');
    return;
  }

  const figmaExport = parseFigmaExport(readJson(exportJsonPath));
  const cases = selectCases(figmaExport.cases, argv);
  if (cases.length === 0) {
    console.log('[parity] 비교할 컴포넌트가 없다.');
    return;
  }

  rmSync(parityResultsDir, { recursive: true, force: true });
  const missingImages = findMissingImages(cases);
  const orphanImages = findOrphanImages(figmaExport.cases);
  if (missingImages.length > 0 || orphanImages.length > 0) {
    for (const file of missingImages) {
      console.error(`[parity] export.json에 있는 이미지가 없다: ${file}`);
    }
    for (const file of orphanImages) {
      console.error(`[parity] export.json에 없는 이미지가 있다: ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const skipped of cases.filter((item) => !isComparedVariant(item))) {
    console.log(
      `[parity] 재질 효과 변형은 비교하지 않는다: ${skipped.component}/${skipped.variant}`,
    );
  }
  const comparedCases = cases.filter(isComparedVariant);

  if (!argv.includes(NO_BUILD_FLAG)) {
    buildStorybook();
  }
  const index = readJson(path.join(storybookStaticDir, 'index.json'));

  const server = await startStaticServer(storybookStaticDir);
  // 임시 실험: --experiment-args="<인자>"와 --experiment-channel=<채널>로 Chromium 실행을 바꾼다.
  const experimentArgs = argv.find((arg) => arg.startsWith('--experiment-args='));
  const experimentChannel = argv.find((arg) => arg.startsWith('--experiment-channel='));
  const browser = await chromium.launch({
    args:
      experimentArgs === undefined
        ? [...BROWSER_ARGS]
        : experimentArgs.slice('--experiment-args='.length).split(' ').filter(Boolean),
    channel: experimentChannel?.slice('--experiment-channel='.length),
  });
  const results: CaseResult[] = [];
  try {
    for (const parityCase of comparedCases) {
      results.push(await runCase(browser, server.url, index, parityCase));
    }
  } finally {
    await browser.close();
    await server.close();
  }

  printSummary(results);
  if (results.some((result) => result.status === 'fail')) {
    process.exitCode = 1;
  }
}

/**
 * 변형 하나를 비교하고, 실패하면 기준·실제·차이 이미지를 남긴다.
 * @param browser Chromium 브라우저
 * @param baseUrl 정적 Storybook 주소
 * @param index Storybook index.json
 * @param parityCase 비교할 변형
 * @returns 비교 결과
 */
async function runCase(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  index: unknown,
  parityCase: ParityCase,
): Promise<CaseResult> {
  const { component, variant } = parityCase;
  const storyId = findParityStoryId(index, component);
  if (storyId === undefined) {
    return failure(
      parityCase,
      `스토리가 없다: src/components/${component}/${component}.stories.tsx의 Parity 스토리를 만든다.`,
    );
  }

  const expectedBuffer = readFileSync(imagePath(parityCase));
  const expected = readPng(expectedBuffer);
  const { pixelWidth: expectedWidth, pixelHeight: expectedHeight } = pixelClip(
    parityCase.renderBounds,
    parityCase.scale,
  );
  if (expected.width !== expectedWidth || expected.height !== expectedHeight) {
    return failure(
      parityCase,
      `피그마 이미지 크기(${expected.width}×${expected.height})가 renderBounds를 픽셀로 덮은 크기(${expectedWidth}×${expectedHeight})과 다르다.`,
    );
  }

  const capture = await captureStory(browser, baseUrl, storyId, parityCase);
  if (capture.image === undefined) {
    return failure(parityCase, capture.ok ? '스크린샷이 없다.' : capture.message);
  }

  const comparison = compareImages(expected, readPng(capture.image));
  if (capture.ok && comparison.status === 'pass') {
    return { component, variant, status: 'pass', message: '일치' };
  }
  // 실패하면 기준·실제 이미지와, 크기가 같으면 차이 이미지를 남긴다.
  const outputDir = path.join(parityResultsDir, component, variant);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'expected.png'), expectedBuffer);
  writeFileSync(path.join(outputDir, 'actual.png'), capture.image);
  if (comparison.status === 'diff') {
    writeFileSync(path.join(outputDir, 'diff.png'), writePng(comparison.diff));
  }
  if (!capture.ok) {
    return failure(parityCase, capture.message);
  }
  if (comparison.status === 'size-mismatch') {
    return failure(parityCase, comparison.message);
  }
  return failure(parityCase, `다른 픽셀 ${comparison.diffPixels}개(허용 ${MAX_DIFF_PIXELS}개)`);
}

/**
 * 실패 결과를 만든다.
 * @param parityCase 비교한 변형
 * @param message 실패 이유
 * @returns 실패 결과
 */
function failure(parityCase: ParityCase, message: string): CaseResult {
  return { component: parityCase.component, variant: parityCase.variant, status: 'fail', message };
}

/**
 * 인자에 따라 비교할 변형을 고른다.
 * @param cases export.json의 모든 변형
 * @param argv 명령줄 인자
 * @returns 비교할 변형
 */
function selectCases(cases: readonly ParityCase[], argv: readonly string[]): ParityCase[] {
  let selected = [...cases];
  const components = argv.flatMap((arg, i) => (arg === COMPONENT_FLAG ? [argv[i + 1] ?? ''] : []));
  if (components.length > 0) {
    selected = selected.filter((item) => components.includes(item.component));
  }
  if (!argv.includes(AFFECTED_FLAG)) {
    return selected;
  }

  const baseIndex = argv.indexOf(BASE_FLAG);
  const base = baseIndex >= 0 ? argv[baseIndex + 1] : DEFAULT_BASES.find(hasRef);
  if (base === undefined) {
    throw new Error(`비교 기준 브랜치를 찾지 못했다. ${BASE_FLAG} <ref>로 정한다.`);
  }
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const packagePrefix = git(['rev-parse', '--show-prefix']).trim();
  const changedFiles = [
    ...git(['diff', '--name-only', '-z', mergeBase]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '--full-name', '-z']).split('\0'),
  ].filter(Boolean);

  const selection = selectAffectedComponents(
    changedFiles,
    packagePrefix,
    componentDependents(readComponentSources()),
    changedExportComponents(readBaseExport(mergeBase, packagePrefix), readJson(exportJsonPath)),
  );
  if (selection.all) {
    console.log(`[parity] ${selection.reason}이 바뀌어 모든 컴포넌트를 비교한다.`);
    return selected;
  }
  console.log(
    `[parity] ${base} 대비 영향받는 컴포넌트: ${[...selection.components].join(', ') || '없음'}`,
  );
  return selected.filter((item) => selection.components.has(item.component));
}

/**
 * Storybook을 정적으로 빌드한다.
 */
function buildStorybook(): void {
  console.log('[parity] Storybook을 빌드한다.');
  // 고정된 명령 문자열 하나로 넘겨 Windows(pnpm.cmd)에서도 셸로 실행한다.
  const result = spawnSync('pnpm run build-storybook --quiet', {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error('Storybook 빌드가 실패했다.');
  }
}

/**
 * export.json의 변형 중 이미지 파일이 없는 것을 찾는다.
 * @param cases 비교할 변형
 * @returns 없는 이미지의 패키지 기준 경로
 */
function findMissingImages(cases: readonly ParityCase[]): string[] {
  return cases
    .map(imagePath)
    .filter((file) => !existsSync(file))
    .map((file) => path.relative(packageRoot, file));
}

/**
 * figma/images에 있지만 export.json에 없는 이미지를 찾는다.
 * @param cases export.json의 모든 변형
 * @returns export.json에 없는 이미지의 패키지 기준 경로
 */
function findOrphanImages(cases: readonly ParityCase[]): string[] {
  if (!existsSync(figmaImagesDir)) {
    return [];
  }
  const known = new Set(cases.map(imagePath));
  return readdirSync(figmaImagesDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.png'))
    .map((file) => path.join(figmaImagesDir, file))
    .filter((file) => !known.has(file))
    .map((file) => path.relative(packageRoot, file));
}

/**
 * 변형의 피그마 이미지 경로를 만든다.
 * @param parityCase 변형
 * @returns figma/images/<component>/<variant>.png 절대 경로
 */
function imagePath(parityCase: ParityCase): string {
  return path.join(figmaImagesDir, parityCase.component, `${parityCase.variant}.png`);
}

/**
 * 컴포넌트 폴더마다 소스 파일 내용을 읽는다(의존 관계 계산용).
 * @returns 컴포넌트 폴더 이름 → 소스 내용 목록
 */
function readComponentSources(): Map<string, string[]> {
  const componentsDir = path.join(packageRoot, 'src', 'components');
  const sources = new Map<string, string[]>();
  if (!existsSync(componentsDir)) {
    return sources;
  }
  for (const component of readdirSync(componentsDir)) {
    const dir = path.join(componentsDir, component);
    const files = readdirSync(dir).filter((file) => /(?<!\.test|\.stories)\.tsx?$/u.test(file));
    sources.set(
      component,
      files.map((file) => readFileSync(path.join(dir, file), 'utf8')),
    );
  }
  return sources;
}

/**
 * 기준 커밋의 export.json을 읽는다.
 * @param mergeBase 기준 커밋
 * @param packagePrefix 저장소 기준 패키지 경로
 * @returns 파싱한 값. 기준 커밋에 파일이 없으면 undefined
 */
function readBaseExport(mergeBase: string, packagePrefix: string): unknown {
  try {
    const content = git(['show', `${mergeBase}:${packagePrefix}figma/export.json`]);
    const json: unknown = JSON.parse(content);
    return json;
  } catch {
    return undefined;
  }
}

/**
 * 비교 결과를 표로 출력하고 summary.json으로 남긴다.
 * @param results 변형별 결과
 */
function printSummary(results: readonly CaseResult[]): void {
  const failed = results.filter((result) => result.status === 'fail');
  console.log(
    `\n[parity] 기준: threshold=${PIXELMATCH_THRESHOLD}, includeAA=${String(SHOULD_INCLUDE_ANTI_ALIASING)}, 허용 픽셀=${MAX_DIFF_PIXELS}`,
  );
  for (const result of results) {
    const mark = result.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${result.component}/${result.variant}  ${result.message}`);
  }
  console.log(
    `[parity] ${results.length}개 중 ${results.length - failed.length}개 통과, ${failed.length}개 실패`,
  );
  if (failed.length > 0) {
    mkdirSync(parityResultsDir, { recursive: true });
    writeFileSync(
      path.join(parityResultsDir, 'summary.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    );
    console.log(
      `[parity] 실패한 변형의 이미지는 ${path.relative(process.cwd(), parityResultsDir)}에 있다.`,
    );
  }
}

/**
 * git 명령을 패키지 폴더에서 실행한다.
 * @param args git 인자
 * @returns 표준 출력
 */
function git(args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * git 참조가 있는지 확인한다.
 * @param ref 브랜치나 커밋
 * @returns 있으면 true
 */
function hasRef(ref: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

/**
 * JSON 파일을 읽는다.
 * @param file 파일 경로
 * @returns 파싱한 값
 */
function readJson(file: string): unknown {
  const json: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return json;
}
