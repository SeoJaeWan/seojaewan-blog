import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import {
  captureCode,
  captureFigma,
  captureMargin,
  diffImage,
  readRenderExtents,
} from './capture.ts';
import { storybookStaticDir } from './paths.ts';
import {
  CAPTURE_RESULT_FILE,
  type CaptureRow,
  CODE_CAPTURE_FILE,
  DIFF_CAPTURE_FILE,
  FIGMA_CAPTURE_FILE,
  RESULTS_DIR_ENV,
  SELECTION_FILE,
} from './results.ts';
import { startStaticServer, type StaticServer } from './static-server.ts';
import { openStory } from './story-page.ts';
import { findStoryId, storyTarget } from './story-target.ts';
import { figmaImagePath, loadTargets, type Target, variantResultDir } from './targets.ts';
import type { VariantEntry } from './variant-name.ts';

// @codocs [[피그마 연동:캡처 표]]
// 변형과 상태마다 피그마와 코드를 같은 조건(배율, 여백, 배경, 상태 재현)으로 캡처하고 차이 그림을 만든다.
// 판정은 하지 않는다. 보통은 run-capture.ts가 범위를 정하고 Storybook을 빌드한 뒤 이 파일을 실행한다.
const resultsDir = process.env[RESULTS_DIR_ENV] ?? '';
if (resultsDir === '') {
  throw new Error(`${RESULTS_DIR_ENV} 환경 변수로 결과 폴더를 정한다(run-capture.ts가 정한다).`);
}
const selectionFile = path.join(resultsDir, SELECTION_FILE);
const selected = existsSync(selectionFile)
  ? new Set(JSON.parse(readFileSync(selectionFile, 'utf8')) as string[])
  : undefined;
const { targets: allTargets, scale } = loadTargets();
const targets = allTargets.filter((target) => selected?.has(target.id) ?? true);
const storybooks = [...new Set(targets.map((target) => target.storybook))];

// Storybook 정적 빌드를 이 파일 안의 작은 서버로 띄운다. 개발 서버보다 결과가 매번 같다.
const servers = new Map<Target['storybook'], { server: StaticServer; index: unknown }>();
test.beforeAll(
  /**
   * 대상이 쓰는 Storybook마다 정적 서버를 띄우고 index.json을 읽는다.
   */
  async () => {
    for (const storybook of storybooks) {
      const dir = storybookStaticDir(storybook);
      const server = await startStaticServer(dir);
      servers.set(storybook, {
        server,
        index: JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8')),
      });
    }
  },
);
test.afterAll(
  /**
   * 띄운 정적 서버를 닫는다.
   */
  async () => {
    for (const { server } of servers.values()) {
      await server.close();
    }
  },
);

// 피그마 PNG와 같은 배율로 찍는다.
test.use({ deviceScaleFactor: scale });

for (const target of targets) {
  for (const variant of target.variants) {
    test(`${target.id} ${variant.variant}`, async ({ page }) => {
      const row = await captureVariant(page, target, variant);
      expect(row.error ?? '').toBe('');
    });
  }
}

/**
 * 변형 하나를 캡처하고 결과 파일을 남긴다.
 * @param page Playwright 페이지
 * @param target 대상
 * @param variant 변형
 * @returns 캡처 표 줄
 */
async function captureVariant(
  page: Page,
  target: Target,
  variant: VariantEntry,
): Promise<CaptureRow> {
  const outputDir = variantResultDir(resultsDir, target, variant.variant);
  /**
   * 변형 결과 폴더의 파일을 결과 폴더 기준 경로로 바꾼다.
   * @param file 파일 이름
   * @returns 결과 폴더 기준 경로
   */
  function relative(file: string): string {
    return path.relative(resultsDir, path.join(outputDir, file)).split(path.sep).join('/');
  }
  mkdirSync(outputDir, { recursive: true });
  const row: CaptureRow = {
    target: target.id,
    name: target.name,
    variant: variant.variant,
    figma: null,
    code: null,
    diff: null,
    error: null,
  };
  try {
    const storybook = servers.get(target.storybook);
    if (storybook === undefined) {
      throw new Error(`${target.storybook} Storybook을 띄우지 못했다.`);
    }
    const story = findStoryId(storybook.index, target);
    if (!story.ok) {
      throw new Error(story.message);
    }
    const { args, interaction } = storyTarget(variant.properties);
    const opened = await openStory(page, storybook.server.url, story.id, args, interaction);
    if (!opened.ok) {
      throw new Error(opened.message);
    }
    const extents = await readRenderExtents(opened.target);
    const margin = captureMargin(extents);
    const code = await captureCode(page, opened.target, margin);
    writeFileSync(path.join(outputDir, CODE_CAPTURE_FILE), code.png);
    row.code = relative(CODE_CAPTURE_FILE);
    const figmaPng = figmaImagePath(target, variant.variant);
    if (!existsSync(figmaPng)) {
      throw new Error(`피그마 그림이 없다: ${path.basename(figmaPng)}`);
    }
    const figma = await captureFigma(page, readFileSync(figmaPng), {
      scale,
      background: code.background,
      extents,
      margin,
    });
    writeFileSync(path.join(outputDir, FIGMA_CAPTURE_FILE), figma);
    row.figma = relative(FIGMA_CAPTURE_FILE);
    writeFileSync(
      path.join(outputDir, DIFF_CAPTURE_FILE),
      await diffImage(page, figma, code.png, code.background),
    );
    row.diff = relative(DIFF_CAPTURE_FILE);
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  writeFileSync(path.join(outputDir, CAPTURE_RESULT_FILE), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}
