import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창을 처음 연다',
  area: '창',
  summary: 'PC 1280×800·노트북 1120×640',
  conditions: {
    device: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
    app: {
      label: '앱',
      values: ['Chrome', '파일 탐색기'],
      base: 'Chrome',
    },
    front: {
      label: '맨 앞 창',
      values: ['없음', '있음(계단식)'],
      base: '없음',
    },
    workArea: {
      label: '작업 영역',
      values: ['기본 크기보다 큼', '기본 크기보다 작음'],
      base: '기본 크기보다 큼',
    },
  },
  noCase: {
    device: {
      모바일: {
        reason: '모바일에서는 창이 늘 전체화면이라 앱별 기본 크기로 열리지 않는다',
        docs: ['[[창 동작:모바일]]'],
      },
    },
  },
  cases: [
    {
      id: 'pc-size',
      result: 'PC 기본 크기 1280×800',
      scenario: 'PC 크기 화면(1800×1000)에서 작업 표시줄의 Chrome 버튼을 눌러 Chrome 창을 연다',
      expected: ['Chrome 창이 PC 기본 크기 1280×800으로 열린다'],
      docs: ['[[창 동작:창 조작]]', '[[반응형:기준]]'],
      async run({ page, check }) {
        await page.setViewportSize({ width: 1800, height: 1000 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const pcChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(pcChrome).toBeVisible();
        await check('Chrome 창이 PC 기본 크기 1280×800으로 열린다', async () => {
          await expect.poll(async () => (await pcChrome.boundingBox())?.width).toBe(1280);
          await expect.poll(async () => (await pcChrome.boundingBox())?.height).toBe(800);
        });
      },
    },
    {
      id: 'laptop-size',
      result: '노트북 기본 크기 1120×640',
      change: { device: '노트북' },
      scenario: '노트북 크기 화면(1500×850)에서 작업 표시줄의 Chrome 버튼을 눌러 Chrome 창을 연다',
      expected: ['Chrome 창이 노트북 기본 크기 1120×640으로 열린다'],
      docs: ['[[창 동작:창 조작]]', '[[반응형:기준]]'],
      async run({ page, check }) {
        await page.setViewportSize({ width: 1500, height: 850 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const laptopChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(laptopChrome).toBeVisible();
        await check('Chrome 창이 노트북 기본 크기 1120×640으로 열린다', async () => {
          await expect.poll(async () => (await laptopChrome.boundingBox())?.width).toBe(1120);
          await expect.poll(async () => (await laptopChrome.boundingBox())?.height).toBe(640);
        });
      },
    },
  ],
});
