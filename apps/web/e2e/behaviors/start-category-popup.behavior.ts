import { expect, type Page } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';
import { wheelScroll } from './wheel-scroll.ts';

/**
 * Start 메뉴를 열고 모두 범주 보기의 글 카드를 눌러 펼침 팝업을 연다.
 * @param page 앱 페이지
 * @returns Start 메뉴, 모두 영역, 펼침 팝업
 */
async function openPostsPopup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  const all = startMenu.getByRole('region', { name: '모두' });
  await expect(all.getByRole('button', { name: '보기: 범주' })).toBeVisible();
  await all.getByText('글', { exact: true }).click();
  const popup = page.getByRole('dialog', { name: '글' });
  await expect(popup).toBeVisible();
  return { startMenu, all, popup };
}

export const behavior = defineBehavior({
  name: 'Start 범주 펼침 팝업을 쓴다',
  area: 'Start',
  summary:
    'Start 가운데에 열림·휠로 뒤 본문이 스크롤되지 않음·항목을 눌러 열림·바깥 클릭과 Esc로 닫힘',
  conditions: {
    input: {
      label: '팝업에 하는 입력',
      values: ['휠 스크롤', '항목 클릭', '바깥 클릭', 'Esc'],
      base: '휠 스크롤',
    },
  },
  cases: [
    {
      id: 'wheel-in-popup',
      scenario: 'Start 범주 보기의 글 카드를 눌러 펼침 팝업을 열고, 팝업 위에서 마우스 휠을 굴린다',
      result: '가운데에 열린 팝업은 그대로이고 뒤 본문도 스크롤되지 않음',
      expected: [
        '팝업이 Start 패널 가운데에 스크롤바 없이 열린다',
        '글이 한 쪽에 다 들어가 휠을 굴려도 넘어가지 않는다',
        '뒤의 Start 본문은 스크롤되지 않는다',
      ],
      docs: ['[[Start 메뉴:모두]]'],
      async run({ page, check }) {
        // Start 본문도 스크롤되는 높이다.
        await page.setViewportSize({ width: 1280, height: 560 });
        const { startMenu, all, popup } = await openPostsPopup(page);
        const panel = startMenu.locator('[data-start-menu-panel]');
        const bodyScroller = all.locator(
          'xpath=ancestor::div[contains(@class, "overflow-y-auto")][1]',
        );
        const firstTile = popup.getByRole('button').first();

        await check('팝업이 Start 패널 가운데에 스크롤바 없이 열린다', async () => {
          await expect
            .poll(async () => {
              const popupBox = await popup.boundingBox();
              const panelBox = await panel.boundingBox();
              if (popupBox === null || panelBox === null) {
                return Number.POSITIVE_INFINITY;
              }
              return Math.max(
                Math.abs(popupBox.x + popupBox.width / 2 - (panelBox.x + panelBox.width / 2)),
                Math.abs(popupBox.y + popupBox.height / 2 - (panelBox.y + panelBox.height / 2)),
              );
            })
            .toBeLessThanOrEqual(1);
          await expect(popup.locator('.overflow-y-auto')).toHaveCount(0);
        });

        const tileBefore = await firstTile.boundingBox();
        const bodyBefore = await bodyScroller.evaluate((element) => element.scrollTop);
        await popup.getByRole('button', { name: 'Next.js App Router 캐시' }).hover();
        await wheelScroll(page, 200);

        await check('글이 한 쪽에 다 들어가 휠을 굴려도 넘어가지 않는다', async () => {
          expect(await firstTile.boundingBox()).toEqual(tileBefore);
        });
        await check('뒤의 Start 본문은 스크롤되지 않는다', async () => {
          expect(await bodyScroller.evaluate((element) => element.scrollTop)).toBe(bodyBefore);
        });
      },
    },
    {
      id: 'click-item',
      change: { input: '항목 클릭' },
      scenario: 'Start 범주 보기에서 글 카드를 눌러 펼침 팝업을 열고, 팝업의 글 항목을 클릭한다',
      result: '글이 열리고 Start가 닫힘',
      expected: ['글이 Chrome 창으로 열린다', '팝업과 Start 메뉴가 닫힌다'],
      docs: ['[[Start 메뉴:모두]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        const { startMenu, popup } = await openPostsPopup(page);

        await popup.getByRole('button', { name: 'TypeScript 5.6 새 기능' }).click();

        await check('글이 Chrome 창으로 열린다', async () => {
          await expect(page.locator('[data-layer="windows"]')).toContainText(
            'TypeScript 5.6 새 기능',
          );
        });
        await check('팝업과 Start 메뉴가 닫힌다', async () => {
          await expect(popup).toBeHidden();
          await expect(startMenu).toBeHidden();
        });
      },
    },
    {
      id: 'click-outside',
      change: { input: '바깥 클릭' },
      scenario:
        'Start 범주 보기에서 글 카드를 눌러 펼침 팝업을 열고, 팝업 바깥의 Start 본문을 클릭한다',
      result: '팝업만 닫힘',
      expected: ['팝업이 닫힌다', 'Start 메뉴는 열려 있다'],
      docs: ['[[Start 메뉴:모두]]'],
      async run({ page, check }) {
        const { startMenu, popup } = await openPostsPopup(page);

        // 팝업은 Start 가운데에 열려 모두 제목을 덮을 수 있어, 팝업이 덮지 않는 위쪽 고정됨 제목을 누른다.
        await startMenu.getByRole('heading', { name: '고정됨' }).click();

        await check('팝업이 닫힌다', async () => {
          await expect(popup).toBeHidden();
        });
        await check('Start 메뉴는 열려 있다', async () => {
          await expect(startMenu).toBeVisible();
        });
      },
    },
    {
      id: 'esc-closes-popup-only',
      change: { input: 'Esc' },
      scenario: 'Start 범주 보기에서 글 카드를 눌러 펼침 팝업을 열고 Esc를 누른다',
      result: '팝업만 닫힘',
      expected: ['팝업이 닫힌다', 'Start 메뉴는 열려 있다'],
      docs: ['[[Start 메뉴:모두]]', '[[Start 메뉴:열기와 닫기]]'],
      async run({ page, check }) {
        const { startMenu, popup } = await openPostsPopup(page);

        await page.keyboard.press('Escape');

        await check('팝업이 닫힌다', async () => {
          await expect(popup).toBeHidden();
        });
        await check('Start 메뉴는 열려 있다', async () => {
          await expect(startMenu).toBeVisible();
        });
      },
    },
  ],
});
