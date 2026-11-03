import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창을 최대화했다가 되돌린다',
  area: '창',
  conditions: {
    maximize: {
      label: '최대화하는 법',
      values: ['최대화 버튼', '제목 표시줄 더블클릭', '위쪽 끝으로 끌기'],
      base: '최대화 버튼',
    },
    restore: {
      label: '되돌리는 법',
      values: ['이전 크기로 복원 버튼', '제목 표시줄 더블클릭', '끌어서 떼기'],
      base: '이전 크기로 복원 버튼',
    },
    placement: {
      label: '최대화 전 자리',
      values: ['보통', '스냅됨'],
      base: '보통',
    },
    app: {
      label: '앱',
      values: ['파일 탐색기', 'Chrome'],
      base: '파일 탐색기',
    },
  },
  cases: [
    {
      id: 'button-and-restore',
      purpose: '창을 최대화하면 "이전 크기로 복원" 버튼으로 바뀌고, 누르면 원래 크기로 돌아간다',
      docs: ['[[창 동작:창 조작]]'],
      async run({ page }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(explorer).toBeVisible();
        const before = await explorer.boundingBox();

        await explorer.getByRole('button', { name: '최대화' }).click();
        const restoreButton = explorer.getByRole('button', { name: '이전 크기로 복원' });
        await expect(restoreButton).toBeVisible();
        const viewport = page.viewportSize();
        await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(viewport?.width);

        await restoreButton.click();
        await expect(explorer.getByRole('button', { name: '최대화' })).toBeVisible();
        await expect.poll(async () => await explorer.boundingBox()).toEqual(before);
      },
    },
  ],
});
