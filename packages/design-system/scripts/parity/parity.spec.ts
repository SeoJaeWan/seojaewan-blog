import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

import { parityResultsDir, storybookStaticDir } from '../package-paths.ts';
import { RESULT_FILE, SELECTION_FILE } from './parity-config.ts';
import { loadParityPlan, type PlanItem } from './parity-plan.ts';
import { inspectItem, openItem } from './parity-runner.ts';
import type { ParityFailure, VariantResult } from './parity-summary.ts';

// @codocs [[피그마 일치 검사:CI 비교]]
// 변형(과 BOOLEAN 경우)마다 스토리를 열고 상태를 재현한 뒤, 피그마 레이어와 같은 이름을 썼는지 확인한다.
const selectionFile = path.join(parityResultsDir, SELECTION_FILE);
const components = existsSync(selectionFile)
  ? (JSON.parse(readFileSync(selectionFile, 'utf8')) as string[])
  : undefined;
const plan = loadParityPlan(components);
const storybookIndex: unknown = JSON.parse(
  readFileSync(path.join(storybookStaticDir, 'index.json'), 'utf8'),
);

for (const item of plan.items) {
  test(`${item.component} ${item.resultName}`, async ({ page }) => {
    const failures = await runItem(page, item);
    expect(failures.map((failure) => failure.message).join('\n')).toBe('');
  });
}

/**
 * 비교 항목 하나를 실행하고 결과 파일과 PR 댓글용 이미지를 남긴다.
 * @param page Playwright 페이지
 * @param item 비교 항목
 * @returns 실패 목록
 */
async function runItem(page: Page, item: PlanItem): Promise<ParityFailure[]> {
  const outputDir = path.join(parityResultsDir, item.component, item.resultName);
  mkdirSync(outputDir, { recursive: true });
  const result: VariantResult = {
    component: item.component,
    variant: item.resultName,
    failures: [],
    notes: [],
    images: [],
  };
  const opened = await openItem(page, item, storybookIndex);
  if (opened.ok) {
    copyFileSync(item.figmaImage, path.join(outputDir, 'figma.png'));
    await opened.target.screenshot({
      path: path.join(outputDir, 'browser.png'),
      animations: 'disabled',
    });
    result.images.push({ label: item.resultName, files: ['figma.png', 'browser.png'] });
    result.failures.push(...(await inspectItem(page, item)));
  } else {
    result.failures.push(...opened.failures);
  }
  writeFileSync(path.join(outputDir, RESULT_FILE), `${JSON.stringify(result, null, 2)}\n`);
  return result.failures;
}
