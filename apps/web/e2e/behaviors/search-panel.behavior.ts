import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '검색 패널을 열고 닫는다',
  area: '검색',
  conditions: {
    open: {
      label: '여는 법',
      values: ['검색칸 클릭', '검색칸에 입력', 'Esc로 닫은 뒤 이어서 입력'],
      base: '검색칸 클릭',
    },
    close: {
      label: '닫는 법',
      values: ['바깥 클릭', 'Esc', '항목 열기', 'Start를 엶'],
      base: '바깥 클릭',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'click-and-outside',
      scenario: '작업 표시줄 검색칸을 클릭해 검색 패널을 열고, 바탕화면의 휴지통 글자를 클릭한다',
      expected: ['검색칸을 클릭하면 검색 패널이 열린다', '바깥을 클릭하면 검색 패널이 닫힌다'],
      docs: ['[[검색:개요]]', '[[검색:결과 화면]]'],
      async run({ page, check }) {
        await page.goto('/');

        await page.getByRole('searchbox', { name: '검색' }).click();
        const searchPanel = page.getByRole('dialog', { name: '검색' });
        await check('검색칸을 클릭하면 검색 패널이 열린다', async () => {
          await expect(searchPanel).toBeVisible();
        });

        await page.getByText('휴지통').click();
        await check('바깥을 클릭하면 검색 패널이 닫힌다', async () => {
          await expect(searchPanel).toBeHidden();
        });
      },
    },
  ],
});
