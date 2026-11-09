import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  captureCode,
  captureFigma,
  captureMargin,
  captureViewport,
  commonCanvas,
  diffImage,
  figmaNodeLayout,
  fitCanvas,
  pngSize,
  readOverflowExtents,
  readRenderExtents,
  type Size,
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
// 변형과 상태마다 코드를 캡처하고 차이 그림을 만든다. 컴포넌트와 조립 모두 피그마 그림과 같은 조건(배율, 여백, 배경, 상태 재현)으로
// 맞춰 비교한다(조립은 참고용).
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

/** 변형 결과 폴더에 그림을 쓰고 결과 폴더 기준 경로를 돌려주는 함수 */
type WriteImage = (file: string, png: Buffer) => string;

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
  mkdirSync(outputDir, { recursive: true });
  /**
   * 변형 결과 폴더에 그림을 쓴다.
   * @param file 파일 이름
   * @param png 그림
   * @returns 결과 폴더 기준 경로
   */
  function write(file: string, png: Buffer): string {
    writeFileSync(path.join(outputDir, file), png);
    return path.relative(resultsDir, path.join(outputDir, file)).split(path.sep).join('/');
  }
  const row: CaptureRow = {
    target: target.id,
    kind: target.kind,
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
    // 아래 함수 선언 안에서도 좁혀진 값을 쓰도록 꺼내 둔다.
    const { server } = storybook;
    const storyId = story.id;
    /**
     * 스토리를 열고 상태를 재현한다.
     * @returns 캡처 대상
     */
    async function open(): Promise<Locator> {
      const { args, interaction } = storyTarget(variant.properties);
      const opened = await openStory(page, server.url, storyId, args, interaction);
      if (!opened.ok) {
        throw new Error(opened.message);
      }
      return opened.target;
    }
    await captureWithFigma(page, target, variant, open, row, write);
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  writeFileSync(path.join(outputDir, CAPTURE_RESULT_FILE), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

/**
 * 컴포넌트·조립 변형을 피그마 PNG와 같은 조건으로 찍고 `피그마 | 코드 | 차이`를 남긴다. 조립은 참고용이다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page Playwright 페이지
 * @param target 대상
 * @param variant 변형
 * @param open 스토리를 여는 함수
 * @param row 채울 캡처 표 줄
 * @param write 그림을 쓰는 함수
 */
async function captureWithFigma(
  page: Page,
  target: Target,
  variant: VariantEntry,
  open: () => Promise<Locator>,
  row: CaptureRow,
  write: WriteImage,
): Promise<void> {
  const figmaPng = figmaImagePath(target, variant.variant);
  if (!existsSync(figmaPng)) {
    throw new Error(`피그마 그림이 없다: ${path.basename(figmaPng)}`);
  }
  const figmaSource = readFileSync(figmaPng);
  const sourceSize = pngSize(figmaSource);
  // 화면보다 큰 대상은 화면을 피그마 PNG 크기에 맞춰 키운다. 배치와 상태 재현이 바뀐 화면에서 일어나도록
  // 스토리를 열기 전에 바꾼다(Playwright 문서도 페이지를 열기 전에 화면 크기를 정하라고 한다).
  await growViewport(page, { width: sourceSize.width / scale, height: sourceSize.height / scale });
  const storyTarget = await open();
  // 피그마 PNG 안 노드 위치는 export.json에서 읽고, 없으면 코드 루트 그림자의 폭으로 짐작한다.
  const extents = await readRenderExtents(storyTarget);
  const layout = figmaNodeLayout(
    { width: sourceSize.width / scale, height: sourceSize.height / scale },
    variant.node,
    extents,
  );
  const margin = captureMargin(extents, await readOverflowExtents(storyTarget), layout.extents);
  const code = await captureCode(page, storyTarget, margin);
  const codeSize = pngSize(code.png);
  // 두 그림을 같은 크기로 만든다. 노드 크기가 다르면 큰 쪽에 맞춘다.
  const canvas = commonCanvas(
    { width: codeSize.width / scale, height: codeSize.height / scale },
    { width: layout.size.width + margin * 2, height: layout.size.height + margin * 2 },
  );
  const codePng = await fitCanvas(page, code.png, scale, canvas, code.background);
  row.code = write(CODE_CAPTURE_FILE, codePng);
  const figma = await captureFigma(page, figmaSource, {
    scale,
    background: code.background,
    extents: layout.extents,
    margin,
    canvas,
  });
  row.figma = write(FIGMA_CAPTURE_FILE, figma);
  row.diff = write(DIFF_CAPTURE_FILE, await diffImage(page, figma, codePng, code.background));
}

/**
 * 대상이 화면에 들어가지 않으면 화면을 키운다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param page Playwright 페이지
 * @param size 대상 크기(CSS px, 둘레로 나간 부분 포함)
 * @returns 화면을 바꿨으면 true
 */
async function growViewport(page: Page, size: Size): Promise<boolean> {
  const viewport = page.viewportSize();
  if (viewport === null) {
    return false;
  }
  const wanted = captureViewport(size, viewport);
  if (wanted.width === viewport.width && wanted.height === viewport.height) {
    return false;
  }
  await page.setViewportSize(wanted);
  return true;
}
