import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { chromium } from '@playwright/test';

import {
  COMPONENT_MANIFEST_FILE,
  FIGMA_COMPONENTS_FOLDER,
  FIGMA_SETTINGS_FILE,
  figmaDir,
  packageRoot,
  parityResultsDir,
  storybookStaticDir,
  tokensJsonPath,
} from '../package-paths.ts';
import { colorTokenTable } from '../tokens/tokens-css.ts';
import { componentDependents, selectAffectedComponents } from './affected-components.ts';
import { captureStory } from './capture-story.ts';
import { compareImages, compareVectorImages, readPng, writePng } from './compare-images.ts';
import type { CheckFailure, VectorResult } from './compare-values.ts';
import { compareVariantValues } from './compare-values.ts';
import type { ParityCase } from './figma-export.ts';
import { isPixelComparedVariant, parseFigmaExport, pixelClip } from './figma-export.ts';
import { measureVariant } from './measure-story.ts';
import type { VariantMeasurement } from './measured-element.ts';
import {
  BROWSER_ARGS,
  FIGMA_LAYER_ATTRIBUTE,
  MAX_DIFF_RATIO,
  PIXEL_THRESHOLD,
  VECTOR_MAX_DIFF_RATIO,
} from './parity-config.ts';
import type { ParitySummary, VariantResult } from './parity-summary.ts';
import { SUMMARY_FILE } from './parity-summary.ts';
import { startStaticServer } from './static-server.ts';
import { findParityStoryId } from './story-target.ts';
import { captureVector } from './vector-capture.ts';

// 사용법: node scripts/parity/run-parity.ts [--affected] [--base <ref>] [--no-build] [--component <name>]... [--figma-dir <dir>]
// --figma-dir는 figma/ 대신 쓸 폴더다(로컬에서 다른 내보내기 자료로 비교해 볼 때).
const AFFECTED_FLAG = '--affected';
const BASE_FLAG = '--base';
const NO_BUILD_FLAG = '--no-build';
const COMPONENT_FLAG = '--component';
const FIGMA_DIR_FLAG = '--figma-dir';
const DEFAULT_BASES = ['origin/main', 'main'] as const;

type Inspected = {
  measurement: VariantMeasurement;
  vectors: Map<string, VectorResult>;
};

await main();

/**
 * 피그마 내보내기 자료와 Storybook 스토리를 값과 픽셀로 비교하고 결과를 요약한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const sourceDir = path.resolve(optionValue(argv, FIGMA_DIR_FLAG) ?? figmaDir);
  if (!existsSync(path.join(sourceDir, FIGMA_SETTINGS_FILE))) {
    console.log(`[parity] ${FIGMA_SETTINGS_FILE}이 아직 없어 피그마 일치 검사를 건너뛴다.`);
    return;
  }
  const componentsDir = path.join(sourceDir, FIGMA_COMPONENTS_FOLDER);
  const manifests = readComponentManifests(componentsDir);
  const figmaExport = parseFigmaExport(
    readJson(path.join(sourceDir, FIGMA_SETTINGS_FILE)),
    manifests,
  );
  const cases = selectCases(figmaExport.cases, argv);
  rmSync(parityResultsDir, { recursive: true, force: true });
  if (cases.length === 0) {
    console.log('[parity] 비교할 컴포넌트가 없다.');
    writeSummary({ total: 0, failed: 0, results: [], fileErrors: [] });
    return;
  }

  const fileErrors = findFileErrors(componentsDir, manifests, figmaExport.cases);
  for (const error of fileErrors) {
    console.error(`[parity] ${error}`);
  }

  if (!argv.includes(NO_BUILD_FLAG)) {
    buildStorybook();
  }
  const index = readJson(path.join(storybookStaticDir, 'index.json'));
  const ownTokens = path.join(sourceDir, 'tokens.json');
  const colors = colorTokenTable(readJson(existsSync(ownTokens) ? ownTokens : tokensJsonPath));

  const server = await startStaticServer(storybookStaticDir);
  const browser = await chromium.launch({ args: [...BROWSER_ARGS] });
  const results: VariantResult[] = [];
  try {
    for (const parityCase of cases) {
      const result = await runCase(browser, server.url, index, parityCase, componentsDir, colors);
      results.push(result);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const failed = results.filter((result) => result.failures.length > 0).length;
  writeSummary({ total: results.length, failed, results, fileErrors });
  printSummary(results, fileErrors);
  if (failed > 0 || fileErrors.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * 변형 하나를 값과 픽셀로 비교하고, 실패하면 기준·실제·차이 이미지를 남긴다.
 * @param browser Chromium 브라우저
 * @param baseUrl 정적 Storybook 주소
 * @param index Storybook index.json
 * @param parityCase 비교할 변형
 * @param componentsDir 피그마 컴포넌트 폴더
 * @param colors 토큰 색 표
 * @returns 변형 결과
 */
async function runCase(
  browser: Browser,
  baseUrl: string,
  index: unknown,
  parityCase: ParityCase,
  componentsDir: string,
  colors: ReadonlyMap<string, string>,
): Promise<VariantResult> {
  const { component, variant } = parityCase;
  const outputDir = path.join(parityResultsDir, component, variant);
  const result: VariantResult = {
    component,
    variant,
    failures: [],
    notes: [],
    images: [],
    vectorRatios: {},
    pixelRatio: null,
  };
  /**
   * 실패를 결과에 더한다.
   * @param failure 실패
   */
  function fail(failure: CheckFailure): void {
    result.failures.push(failure);
  }

  const storyId = findParityStoryId(index, component);
  if (storyId === undefined) {
    fail({
      layer: 'story',
      message: `스토리가 없다: src/components/${component}/${component}.stories.tsx의 Parity 스토리를 만든다`,
    });
    return result;
  }
  if (parityCase.layersError !== undefined) {
    fail({ layer: 'export', message: parityCase.layersError });
  }

  const capture = await captureStory(
    browser,
    baseUrl,
    storyId,
    parityCase,
    async (context, page, target) =>
      inspect(context, page, target, parityCase, componentsDir, outputDir, result),
  );
  if (!capture.ok) {
    fail({ layer: 'root', message: capture.message });
  }
  if (capture.inspected !== undefined && parityCase.layersError === undefined) {
    const values = compareVariantValues(
      parityCase.layers,
      capture.inspected.measurement,
      colors,
      capture.inspected.vectors,
    );
    result.failures.push(...values.failures);
    result.notes.push(...values.notes);
  }

  if (capture.image !== undefined) {
    if (isPixelComparedVariant(parityCase)) {
      const expectedBuffer = readFileSync(path.join(componentsDir, component, `${variant}.png`));
      const expected = readPng(expectedBuffer);
      const { pixelWidth, pixelHeight } = pixelClip(parityCase.renderBounds, parityCase.scale);
      if (expected.width !== pixelWidth || expected.height !== pixelHeight) {
        fail({
          layer: 'image',
          message: `피그마 이미지 크기(${expected.width}×${expected.height})가 renderBounds를 픽셀로 덮은 크기(${pixelWidth}×${pixelHeight})와 다르다`,
        });
      }
      const comparison = compareImages(expected, readPng(capture.image));
      result.pixelRatio = comparison.status === 'size-mismatch' ? null : comparison.ratio;
      if (comparison.status !== 'pass') {
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(path.join(outputDir, 'expected.png'), expectedBuffer);
        writeFileSync(path.join(outputDir, 'actual.png'), capture.image);
        const images = ['expected.png', 'actual.png'];
        if (comparison.status === 'diff') {
          writeFileSync(path.join(outputDir, 'diff.png'), writePng(comparison.diff));
          images.push('diff.png');
        }
        result.images.push({ label: '전체', files: images });
        fail({
          layer: 'image',
          hasImage: true,
          message:
            comparison.status === 'diff'
              ? `전체 이미지 다른 픽셀 ${percent(comparison.ratio)} (허용 ${percent(MAX_DIFF_RATIO)})`
              : comparison.message,
        });
      }
    } else {
      result.notes.push('재질 효과 변형이라 전체 이미지는 픽셀로 비교하지 않고 값만 비교했다');
    }
  }
  return result;
}

/**
 * 스크린샷을 찍은 상태 그대로 값을 재고, vector 레이어를 피그마 SVG와 그려 비교한다.
 * @param context 브라우저 컨텍스트
 * @param page 스토리 페이지
 * @param target 비교 요소
 * @param parityCase 변형
 * @param componentsDir 피그마 컴포넌트 폴더
 * @param outputDir 결과 이미지 폴더
 * @param result 변형 결과(이미지 목록을 채운다)
 * @returns 측정값과 vector 비교 결과
 */
async function inspect(
  context: BrowserContext,
  page: Page,
  target: Locator,
  parityCase: ParityCase,
  componentsDir: string,
  outputDir: string,
  result: VariantResult,
): Promise<Inspected> {
  const measurement = await measureVariant(page, target);
  const vectors = new Map<string, VectorResult>();
  for (const layer of parityCase.layers) {
    if (layer.kind !== 'vector' || layer.svg === undefined) {
      continue;
    }
    const element = page.locator(`[${FIGMA_LAYER_ATTRIBUTE}="${layer.path}"]`);
    if ((await element.count()) !== 1 || !(await element.isVisible())) {
      continue;
    }
    const svgPath = path.join(componentsDir, parityCase.component, layer.svg.file);
    if (!existsSync(svgPath)) {
      vectors.set(layer.path, { ok: false, message: `SVG 파일 ${layer.svg.file}이 없다` });
      continue;
    }
    const capture = await captureVector(
      context,
      page,
      element,
      layer,
      readFileSync(svgPath, 'utf8'),
      parityCase.scale,
    );
    const comparison = compareVectorImages(readPng(capture.expected), readPng(capture.actual));
    if (comparison.status !== 'size-mismatch') {
      result.vectorRatios[layer.path] = comparison.ratio;
    }
    if (comparison.status === 'pass') {
      vectors.set(layer.path, { ok: true });
      continue;
    }
    const prefix = `vector-${safeFileName(layer.path)}`;
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, `${prefix}-expected.png`), capture.expected);
    writeFileSync(path.join(outputDir, `${prefix}-actual.png`), capture.actual);
    const files = [`${prefix}-expected.png`, `${prefix}-actual.png`];
    if (comparison.status === 'diff') {
      writeFileSync(path.join(outputDir, `${prefix}-diff.png`), writePng(comparison.diff));
      files.push(`${prefix}-diff.png`);
    }
    result.images.push({ label: layer.path, files });
    vectors.set(layer.path, {
      ok: false,
      message:
        comparison.status === 'diff'
          ? `모양 다름 (다른 픽셀 ${percent(comparison.ratio)}, 허용 ${percent(VECTOR_MAX_DIFF_RATIO)})`
          : comparison.message,
    });
  }
  return { measurement, vectors };
}

/**
 * 컴포넌트 폴더마다 export.json을 읽는다.
 * @param componentsDir 피그마 컴포넌트 폴더
 * @returns 폴더 이름 → export.json 값
 */
function readComponentManifests(componentsDir: string): Record<string, unknown> {
  if (!existsSync(componentsDir)) {
    return {};
  }
  const manifests: Record<string, unknown> = {};
  for (const component of readdirSync(componentsDir).sort()) {
    const file = path.join(componentsDir, component, COMPONENT_MANIFEST_FILE);
    if (existsSync(file)) {
      manifests[component] = readJson(file);
    }
  }
  return manifests;
}

/**
 * 컴포넌트 폴더의 파일이 export.json과 맞는지 확인한다.
 * 변형 PNG·SVG가 없거나, export.json이 가리키지 않는 파일·export.json 없는 폴더가 있으면 오류다.
 * @param componentsDir 피그마 컴포넌트 폴더
 * @param manifests 폴더 이름 → export.json 값
 * @param cases 모든 변형
 * @returns 오류 메시지 목록
 */
function findFileErrors(
  componentsDir: string,
  manifests: Readonly<Record<string, unknown>>,
  cases: readonly ParityCase[],
): string[] {
  const errors: string[] = [];
  if (!existsSync(componentsDir)) {
    return errors;
  }
  for (const component of readdirSync(componentsDir).sort()) {
    if (!(component in manifests)) {
      errors.push(`${FIGMA_COMPONENTS_FOLDER}/${component}/에 ${COMPONENT_MANIFEST_FILE}이 없다`);
      continue;
    }
    const own = cases.filter((item) => item.component === component);
    const wanted = new Set([
      COMPONENT_MANIFEST_FILE,
      ...own.map((item) => `${item.variant}.png`),
      ...own.flatMap((item) =>
        item.layers.flatMap((layer) => (layer.svg === undefined ? [] : [layer.svg.file])),
      ),
    ]);
    const present = new Set(readdirSync(path.join(componentsDir, component)));
    for (const file of wanted) {
      if (!present.has(file)) {
        errors.push(`${FIGMA_COMPONENTS_FOLDER}/${component}/${file}이 없다`);
      }
    }
    for (const file of present) {
      if (!wanted.has(file)) {
        errors.push(
          `${FIGMA_COMPONENTS_FOLDER}/${component}/${file}은 export.json이 가리키지 않는 파일이다`,
        );
      }
    }
  }
  return errors;
}

/**
 * 인자에 따라 비교할 변형을 고른다.
 * @param cases 모든 변형
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

  const base = optionValue(argv, BASE_FLAG) ?? DEFAULT_BASES.find(hasRef);
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
 * 결과를 parity-results/summary.json으로 남긴다. PR 댓글은 이 파일로 만든다.
 * @param summary 요약
 */
function writeSummary(summary: ParitySummary): void {
  mkdirSync(parityResultsDir, { recursive: true });
  writeFileSync(path.join(parityResultsDir, SUMMARY_FILE), `${JSON.stringify(summary, null, 2)}\n`);
}

/**
 * 비교 결과를 출력한다.
 * @param results 변형별 결과
 * @param fileErrors 파일 오류
 */
function printSummary(results: readonly VariantResult[], fileErrors: readonly string[]): void {
  const failed = results.filter((result) => result.failures.length > 0);
  console.log(
    `\n[parity] 기준: 위치·크기 ±0.5px, 값 정확히, 전체 픽셀 threshold=${PIXEL_THRESHOLD} 허용 ${percent(MAX_DIFF_RATIO)}, 벡터 허용 ${percent(VECTOR_MAX_DIFF_RATIO)}`,
  );
  for (const result of results) {
    const mark = result.failures.length === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${result.component}/${result.variant}`);
    for (const failure of result.failures) {
      console.log(`        - ${failure.message}`);
    }
    for (const note of result.notes) {
      console.log(`        · ${note}`);
    }
  }
  console.log(
    `[parity] ${results.length}개 중 ${results.length - failed.length}개 통과, ${failed.length}개 실패${fileErrors.length > 0 ? `, 파일 오류 ${fileErrors.length}개` : ''}`,
  );
}

/**
 * 비율을 백분율로 쓴다.
 * @param ratio 0~1 비율
 * @returns `1.23%`
 */
function percent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

/**
 * 레이어 경로를 파일 이름에 쓸 수 있게 바꾼다.
 * @param value 레이어 경로
 * @returns 파일 이름 조각
 */
function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]+/gu, '_');
}

/**
 * `--이름 값` 형태의 인자 값을 읽는다.
 * @param argv 명령줄 인자
 * @param flag 인자 이름
 * @returns 값, 없으면 undefined
 */
function optionValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
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
