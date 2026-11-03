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
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  noCase: {
    screen: {
      모바일: {
        reason: '모바일에서는 창이 늘 전체화면이라 최대화와 복원이 없다',
        docs: ['[[창 동작:모바일]]'],
      },
    },
  },
  cases: [
    {
      id: 'button-and-restore',
      scenario:
        '파일 탐색기 창의 최대화 버튼을 눌러 최대화한 뒤, "이전 크기로 복원" 버튼을 눌러 되돌린다',
      expected: [
        '최대화하면 버튼이 "이전 크기로 복원"으로 바뀐다',
        '최대화하면 창이 화면 폭을 채운다',
        '복원하면 버튼이 다시 최대화로 바뀐다',
        '복원하면 원래 크기와 자리로 돌아온다',
      ],
      docs: ['[[창 동작:창 조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(explorer).toBeVisible();
        const before = await explorer.boundingBox();

        await explorer.getByRole('button', { name: '최대화' }).click();
        const restoreButton = explorer.getByRole('button', { name: '이전 크기로 복원' });
        await check('최대화하면 버튼이 "이전 크기로 복원"으로 바뀐다', async () => {
          await expect(restoreButton).toBeVisible();
        });
        const viewport = page.viewportSize();
        await check('최대화하면 창이 화면 폭을 채운다', async () => {
          await expect
            .poll(async () => (await explorer.boundingBox())?.width)
            .toBe(viewport?.width);
        });

        await restoreButton.click();
        await check('복원하면 버튼이 다시 최대화로 바뀐다', async () => {
          await expect(explorer.getByRole('button', { name: '최대화' })).toBeVisible();
        });
        await check('복원하면 원래 크기와 자리로 돌아온다', async () => {
          await expect.poll(async () => await explorer.boundingBox()).toEqual(before);
        });
      },
    },
  ],
});
