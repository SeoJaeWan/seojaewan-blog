import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: 'Start에서 항목을 연다',
  area: 'Start',
  summary: 'Start에서 폴더가 열림',
  conditions: {
    section: {
      label: 'Start 안의 영역',
      values: ['고정됨', '모두'],
      base: '고정됨',
    },
    item: {
      label: '여는 항목',
      values: ['폴더', '글', '외부 링크', '앱'],
      base: '폴더',
    },
    input: {
      label: '입력 방식',
      values: ['마우스 클릭', 'Enter·Space', '우클릭 메뉴의 열기', '터치 탭'],
      base: '마우스 클릭',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'pinned-folder',
      result: 'Blog 탐색기가 열리고 Start 닫힘',
      scenario: 'Start 버튼을 눌러 Start 메뉴를 열고, 고정됨의 Blog 폴더를 마우스로 클릭한다',
      expected: ['Blog 폴더의 탐색기 창이 열린다', 'Start 메뉴가 닫힌다'],
      docs: ['[[Start 메뉴:열기와 닫기]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        await startMenu
          .getByRole('region', { name: '고정됨' })
          .getByRole('button', { name: 'Blog' })
          .click();

        await check('Blog 폴더의 탐색기 창이 열린다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        });
        await check('Start 메뉴가 닫힌다', async () => {
          await expect(startMenu).toBeHidden();
        });
      },
    },
  ],
});
