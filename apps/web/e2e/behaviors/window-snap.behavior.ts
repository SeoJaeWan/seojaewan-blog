import { expect } from '@playwright/test';

import { dragMouse, openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창을 스냅한다',
  area: '창',
  conditions: {
    how: {
      label: '스냅하는 법',
      values: ['끌어서 스냅', '스냅 레이아웃'],
      base: '끌어서 스냅',
    },
    cell: {
      label: '칸',
      values: ['절반', '3분의 2·3분의 1', '4분의 1', '최대화(위쪽 끝)'],
      base: '절반',
    },
    others: {
      label: '다른 창',
      values: ['있음', '없음', '최소화됨'],
      base: '있음',
    },
    after: {
      label: '그 뒤',
      values: ['Snap Assist에서 고름', 'Snap Assist를 Esc로 닫음', '최대화 후 복원', '끌어서 뗌'],
      base: 'Snap Assist에서 고름',
    },
  },
  cases: [
    {
      id: 'drag-left-and-assist',
      purpose:
        '창을 화면 왼쪽 끝으로 끌어 절반에 스냅하면 남은 칸에 다른 창을 제안하고, 고르면 그 창이 남은 칸을 채운다',
      docs: ['[[스냅:끌어서 스냅]]', '[[스냅:Snap Assist]]'],
      async run({ page }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
        await openBlogFolder(page);
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();

        const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        const viewport = page.viewportSize();
        if (viewport === null) {
          throw new Error('화면 크기를 알 수 없다');
        }
        const box = await blog.boundingBox();
        if (box === null) {
          throw new Error('창 자리를 알 수 없다');
        }

        await dragMouse(page, { x: box.x + 600, y: box.y + 16 }, { x: 2, y: 300 });
        await expect.poll(async () => (await blog.boundingBox())?.x).toBe(0);
        await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width / 2);

        const assist = page.getByRole('dialog', { name: 'Snap Assist' });
        await expect(assist).toBeVisible();
        await assist.locator('[data-snap-assist-suggestion]').first().click();
        await expect(assist).not.toBeAttached();
        await expect
          .poll(async () => (await desktopWindow.boundingBox())?.x)
          .toBe(viewport.width / 2);
        await expect
          .poll(async () => (await desktopWindow.boundingBox())?.width)
          .toBe(viewport.width / 2);
      },
    },
    {
      id: 'layout-then-maximize-restore',
      change: { how: '스냅 레이아웃', others: '없음', after: '최대화 후 복원' },
      purpose:
        '최대화 버튼에 올려 스냅 레이아웃의 칸을 고르면 그 자리를 채우고, 최대화했다가 복원하면 그 칸으로 돌아온다',
      docs: ['[[스냅:스냅 레이아웃]]', '[[스냅:스냅된 창]]'],
      async run({ page }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(explorer).toBeVisible();
        const viewport = page.viewportSize();
        if (viewport === null) {
          throw new Error('화면 크기를 알 수 없다');
        }

        await explorer.getByRole('button', { name: '최대화' }).hover();
        const layouts = page.getByRole('dialog', { name: '스냅 레이아웃' });
        await expect(layouts).toBeVisible();
        await layouts
          .getByRole('group', { name: '반반' })
          .getByRole('button', { name: '오른쪽 절반' })
          .click();
        await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(viewport.width / 2);
        await expect
          .poll(async () => (await explorer.boundingBox())?.width)
          .toBe(viewport.width / 2);
        const snapped = await explorer.boundingBox();

        await explorer.getByRole('button', { name: '최대화' }).click();
        await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(viewport.width);
        await explorer.getByRole('button', { name: '이전 크기로 복원' }).click();
        await expect.poll(async () => await explorer.boundingBox()).toEqual(snapped);
      },
    },
  ],
});
