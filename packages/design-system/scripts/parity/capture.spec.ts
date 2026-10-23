import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import {
  COMPONENT_MANIFEST_FILE,
  FIGMA_COMPONENTS_FOLDER,
  FIGMA_SETTINGS_FILE,
  figmaDir,
  parityResultsDir,
  storybookStaticDir,
  tokensJsonPath,
} from '../package-paths.ts';
import {
  captureCode,
  captureFigma,
  captureMargin,
  type Extents,
  noExtents,
  shadowExtents,
} from './capture.ts';
import { type FigmaTokens, readFigmaTokens } from './figma-tokens.ts';
import { SELECTION_FILE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import { openItem } from './parity-runner.ts';
import {
  CAPTURE_RESULT_FILE,
  type CaptureRow,
  CODE_CAPTURE_FILE,
  FIGMA_CAPTURE_FILE,
} from './parity-summary.ts';

// @codocs [[피그마 일치 검사:캡처 표]]
// 변형과 상태, BOOLEAN 경우마다 피그마와 코드를 같은 조건(배율, 여백, 배경, 상태 재현)으로 캡처한다.
// 판정은 하지 않는다. 보통은 run-parity.ts --capture가 범위를 정해 이 파일을 실행한다.
const selectionFile = path.join(parityResultsDir, SELECTION_FILE);
const components = existsSync(selectionFile)
  ? (JSON.parse(readFileSync(selectionFile, 'utf8')) as string[])
  : undefined;
const plan = loadParityPlan(components);
const storybookIndex: unknown = JSON.parse(
  readFileSync(path.join(storybookStaticDir, 'index.json'), 'utf8'),
);
const scale = figmaScale();
const tokens = existsSync(tokensJsonPath)
  ? readFigmaTokens(JSON.parse(readFileSync(tokensJsonPath, 'utf8')))
  : undefined;

// 피그마 PNG와 같은 배율로 찍는다.
test.use({ deviceScaleFactor: scale });

for (const item of plan.items) {
  test(`${item.component} ${item.resultName}`, async ({ page }) => {
    const row = await captureItem(page, item);
    expect(row.error ?? '').toBe('');
  });
}

/**
 * 비교 항목 하나를 캡처하고 결과 파일을 남긴다.
 * @param page Playwright 페이지
 * @param item 비교 항목
 * @returns 캡처 표 줄
 */
async function captureItem(page: Page, item: PlanItem): Promise<CaptureRow> {
  const relativeDir = path.posix.join(item.component, item.resultName);
  const outputDir = path.join(parityResultsDir, item.component, item.resultName);
  mkdirSync(outputDir, { recursive: true });
  const row: CaptureRow = {
    component: item.component,
    variant: item.resultName,
    baseVariant: item.variant,
    isCase: item.caseKey !== null,
    figma: null,
    code: null,
    error: null,
  };
  try {
    // 판정과 같은 방법(스토리 args, 실제 마우스·키보드)으로 상태를 재현한다.
    const opened = await openItem(page, item, storybookIndex);
    if (!opened.ok) {
      throw new Error(opened.failures.map((failure) => failure.message).join('; '));
    }
    const extents = rootShadowExtents(item, tokens);
    const margin = captureMargin(extents);
    const code = await captureCode(page, opened.target, margin);
    writeFileSync(path.join(outputDir, CODE_CAPTURE_FILE), code.png);
    row.code = path.posix.join(relativeDir, CODE_CAPTURE_FILE);
    // 피그마는 변형마다 PNG 하나만 내보내므로 BOOLEAN 경우에는 피그마 캡처가 없다.
    if (item.caseKey === null && existsSync(item.figmaImage)) {
      const figma = await captureFigma(page, readFileSync(item.figmaImage), {
        scale,
        background: code.background,
        extents,
        margin,
      });
      writeFileSync(path.join(outputDir, FIGMA_CAPTURE_FILE), figma);
      row.figma = path.posix.join(relativeDir, FIGMA_CAPTURE_FILE);
    }
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  writeFileSync(path.join(outputDir, CAPTURE_RESULT_FILE), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

/**
 * 변형 루트의 효과 스타일에서 그림자가 노드 둘레로 나가는 폭을 구한다. 피그마 PNG가 그만큼 넓다.
 * @param item 비교 항목
 * @param figmaTokens tokens.json 토큰 표
 * @returns 방향마다 나가는 폭
 */
function rootShadowExtents(item: PlanItem, figmaTokens: FigmaTokens | undefined): Extents {
  const manifest: unknown = JSON.parse(
    readFileSync(
      path.join(figmaDir, FIGMA_COMPONENTS_FOLDER, item.component, COMPONENT_MANIFEST_FILE),
      'utf8',
    ),
  );
  const variants = field(field(manifest, 'variants'), item.variant);
  const layers = field(variants, 'layers');
  const effect = field(Array.isArray(layers) ? (layers as unknown[])[0] : undefined, 'effect');
  const shadow = typeof effect === 'string' ? figmaTokens?.effects.get(effect)?.shadow : undefined;
  return shadow === undefined || shadow === null ? noExtents : shadowExtents(shadow.layers);
}

/**
 * 객체의 칸 값을 읽는다.
 * @param value 값
 * @param key 칸 이름
 * @returns 칸 값. 객체가 아니면 undefined
 */
function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

/**
 * figma.json의 PNG 배율을 읽는다.
 * @returns 배율(없으면 1)
 */
function figmaScale(): number {
  const file = path.join(figmaDir, FIGMA_SETTINGS_FILE);
  if (!existsSync(file)) {
    return 1;
  }
  const value = field(JSON.parse(readFileSync(file, 'utf8')), 'scale');
  return typeof value === 'number' && value > 0 ? value : 1;
}
