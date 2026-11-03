import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: 'Start에서 항목을 연다',
  area: 'Start',
  conditions: {
    section: {
      label: '영역',
      values: ['고정됨', '모두'],
      base: '고정됨',
    },
    item: {
      label: '항목',
      values: ['폴더', '글', '외부 링크', '앱'],
      base: '폴더',
    },
    input: {
      label: '입력',
      values: ['클릭', 'Enter·Space', '우클릭 메뉴의 열기'],
      base: '클릭',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'pinned-folder',
      purpose: 'Start 고정됨의 Blog 폴더를 열면 탐색기 창이 열리고 Start가 닫힌다',
      docs: ['[[Start 메뉴:열기와 닫기]]', '[[창 동작:열기 규칙]]'],
      async run({ page }) {
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        await startMenu
          .getByRole('region', { name: '고정됨' })
          .getByRole('button', { name: 'Blog' })
          .click();

        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await expect(startMenu).toBeHidden();
      },
    },
  ],
});
