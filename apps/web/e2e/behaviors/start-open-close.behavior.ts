import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: 'Start 메뉴를 열고 닫는다',
  area: 'Start',
  conditions: {
    close: {
      label: '닫는 법',
      values: [
        'Esc',
        'Start 버튼 다시 누르기',
        '바깥 클릭',
        '포커스가 밖으로 나감',
        '검색 패널을 엶',
      ],
      base: 'Esc',
    },
    submenu: {
      label: '열린 하위 메뉴',
      values: ['전원 메뉴', '없음'],
      base: '전원 메뉴',
    },
    height: {
      label: '화면 높이',
      values: ['보통', '낮음'],
      base: '보통',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'power-menu-and-esc',
      scenario:
        'Start 버튼을 눌러 Start 메뉴를 열고, 전원 버튼으로 전원 메뉴를 연 뒤 Esc를 두 번 누른다',
      expected: [
        '첫 Esc는 전원 메뉴만 닫고 Start 메뉴는 열려 있다',
        '두 번째 Esc는 Start 메뉴를 닫는다',
      ],
      docs: ['[[Start 메뉴:열기와 닫기]]', '[[Start 메뉴:구성]]'],
      async run({ page, check }) {
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        await expect(startMenu).toBeVisible();

        await startMenu.getByRole('button', { name: '전원' }).click();
        await expect(page.getByRole('menuitem', { name: '다시 시작' })).toBeVisible();
        await page.keyboard.press('Escape');
        await check('첫 Esc는 전원 메뉴만 닫고 Start 메뉴는 열려 있다', async () => {
          await expect(page.getByRole('menuitem', { name: '다시 시작' })).toBeHidden();
          await expect(startMenu).toBeVisible();
        });

        await page.keyboard.press('Escape');
        await check('두 번째 Esc는 Start 메뉴를 닫는다', async () => {
          await expect(startMenu).toBeHidden();
        });
      },
    },
    {
      id: 'low-screen',
      change: { height: '낮음' },
      scenario: '화면 높이가 300px인 브라우저에서 Start 버튼을 눌러 Start 메뉴를 연다',
      expected: [
        'Start 패널 높이가 작업 영역에서 틈을 뺀 240px로 줄어든다',
        '검색칸과 프로필·전원 줄이 패널 안에 남는다',
      ],
      docs: ['[[Start 메뉴:구성]]'],
      async run({ page, check }) {
        await page.setViewportSize({ width: 1280, height: 300 });
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        await expect(startMenu).toBeVisible();

        const panel = await startMenu.locator(':scope > *').first().boundingBox();
        const searchBox = await startMenu
          .getByRole('searchbox', { name: '시작 메뉴 검색' })
          .boundingBox();
        const powerButton = await startMenu.getByRole('button', { name: '전원' }).boundingBox();
        if (panel === null || searchBox === null || powerButton === null) {
          throw new Error('Start 패널을 찾지 못했다');
        }
        await check('Start 패널 높이가 작업 영역에서 틈을 뺀 240px로 줄어든다', () => {
          // 작업 영역(300 - 작업 표시줄 48)에서 틈 12를 뺀 높이다
          expect(panel.height).toBe(240);
        });
        await check('검색칸과 프로필·전원 줄이 패널 안에 남는다', () => {
          expect(searchBox.y).toBeGreaterThanOrEqual(panel.y);
          expect(powerButton.y).toBeGreaterThanOrEqual(searchBox.y + searchBox.height);
          expect(powerButton.y + powerButton.height).toBeLessThanOrEqual(panel.y + panel.height);
        });
      },
    },
  ],
});
