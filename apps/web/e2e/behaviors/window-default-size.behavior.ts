import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창을 처음 연다',
  area: '창',
  conditions: {
    device: {
      label: '화면 구간',
      values: ['PC', '노트북'],
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
  cases: [
    {
      id: 'pc-size',
      purpose: 'PC 구간에서는 Chrome이 PC 기본 크기(1280×800)로 열린다',
      docs: ['[[창 동작:창 조작]]', '[[반응형:기준]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 1800, height: 1000 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Chrome' }).click();
        const pcChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(pcChrome).toBeVisible();
        await expect.poll(async () => (await pcChrome.boundingBox())?.width).toBe(1280);
        await expect.poll(async () => (await pcChrome.boundingBox())?.height).toBe(800);
      },
    },
    {
      id: 'laptop-size',
      change: { device: '노트북' },
      purpose: '노트북 구간에서는 Chrome이 노트북 기본 크기(1120×640)로 열린다',
      docs: ['[[창 동작:창 조작]]', '[[반응형:기준]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 1500, height: 850 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Chrome' }).click();
        const laptopChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(laptopChrome).toBeVisible();
        await expect.poll(async () => (await laptopChrome.boundingBox())?.width).toBe(1120);
        await expect.poll(async () => (await laptopChrome.boundingBox())?.height).toBe(640);
      },
    },
  ],
});
