import { expect, type Page } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

/** 점프 목록과 항목 메뉴의 고정 해제 항목·압정 해제 버튼 이름. */
const UNPIN_LABEL = '이 목록에서 고정 해제';

/**
 * 작업 표시줄 탐색기 버튼을 우클릭해 점프 목록을 연다.
 * @param page 앱 페이지
 */
async function openJumpList(page: Page): Promise<void> {
  await page.getByRole('button', { name: '파일 탐색기' }).click({ button: 'right' });
  await expect(page.getByRole('group', { name: '고정됨' })).toBeVisible();
}

/**
 * 점프 목록 "고정됨"의 폴더 이름을 차례대로 읽는다.
 * @param page 앱 페이지
 * @returns 폴더 이름
 */
async function readPinnedNames(page: Page): Promise<string[]> {
  return page.getByRole('group', { name: '고정됨' }).getByRole('menuitem').allTextContents();
}

/**
 * 포커스가 열린 메뉴(점프 목록) 안에 있는지 본다.
 * @param page 앱 페이지
 * @returns 포커스가 메뉴 안에 있는지
 */
async function isFocusInMenu(page: Page): Promise<boolean> {
  return page.evaluate(() => document.activeElement?.closest('[role="menu"]') != null);
}

export const behavior = defineBehavior({
  name: '작업 표시줄 탐색기 점프 목록의 고정 폴더를 다룬다',
  area: '작업 표시줄',
  summary:
    '항목 메뉴로 고정 해제해도 점프 목록이 열려 있음·폴더를 새 창으로 엶·길게 눌러 항목 메뉴',
  conditions: {
    action: {
      label: '조작',
      values: ['항목 메뉴로 고정 해제', '항목 누르기', '항목 메뉴의 열기', '압정 해제 버튼'],
      base: '항목 메뉴로 고정 해제',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  requires: [{ when: { input: '터치' }, then: { screen: '모바일' } }],
  noCase: {
    screen: {
      노트북: {
        reason: 'PC와 노트북은 입력이 같고 점프 목록 모양도 같다',
        docs: ['[[반응형:입력 차이]]'],
      },
    },
  },
  cases: [
    {
      id: 'unpin-from-item-menu',
      scenario:
        '작업 표시줄 탐색기 버튼을 우클릭해 연 점프 목록에서 Project를 우클릭하고, 항목 메뉴의 "이 목록에서 고정 해제"를 누른다',
      result: '빠지고 점프 목록은 열려 있음',
      expected: [
        '항목 메뉴는 열기와 이 목록에서 고정 해제다',
        'Project가 고정됨에서 빠지고 점프 목록은 열려 있다',
        '포커스가 점프 목록으로 돌아온다',
      ],
      docs: ['[[작업 표시줄:우클릭 메뉴]]', '[[고정:즐겨찾기 고정]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openJumpList(page);
        await page.getByRole('menuitem', { name: 'Project' }).click({ button: 'right' });
        await check('항목 메뉴는 열기와 이 목록에서 고정 해제다', async () => {
          await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
            '열기',
            UNPIN_LABEL,
          ]);
        });

        await page.getByRole('menuitem', { name: UNPIN_LABEL }).click();
        await check('Project가 고정됨에서 빠지고 점프 목록은 열려 있다', async () => {
          await expect.poll(() => readPinnedNames(page)).toEqual(['Blog', 'About']);
          await expect(page.getByRole('menu')).toHaveCount(1);
        });
        await check('포커스가 점프 목록으로 돌아온다', async () => {
          await expect.poll(() => isFocusInMenu(page)).toBe(true);
        });
      },
    },
    {
      id: 'open-pinned-folder',
      change: { action: '항목 누르기' },
      scenario: '작업 표시줄 탐색기 버튼을 우클릭해 연 점프 목록에서 Blog를 누른다',
      result: '그 폴더를 연 새 창',
      expected: ['Blog 폴더를 연 탐색기 창이 열리고 점프 목록은 닫힌다'],
      docs: ['[[작업 표시줄:우클릭 메뉴]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openJumpList(page);
        await page.getByRole('menuitem', { name: 'Blog' }).click();
        await check('Blog 폴더를 연 탐색기 창이 열리고 점프 목록은 닫힌다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
          await expect(page.getByRole('menu')).toHaveCount(0);
        });
      },
    },
    {
      id: 'open-from-item-menu',
      change: { action: '항목 메뉴의 열기' },
      scenario: '점프 목록에서 About을 우클릭하고 항목 메뉴의 열기를 누른다',
      result: '그 폴더를 연 새 창',
      expected: ['About 폴더를 연 탐색기 창이 열리고 메뉴가 모두 닫힌다'],
      docs: ['[[작업 표시줄:우클릭 메뉴]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openJumpList(page);
        await page.getByRole('menuitem', { name: 'About' }).click({ button: 'right' });
        await page.getByRole('menuitem', { name: '열기' }).click();
        await check('About 폴더를 연 탐색기 창이 열리고 메뉴가 모두 닫힌다', async () => {
          await expect(page.getByRole('region', { name: 'About - 파일 탐색기' })).toBeVisible();
          await expect(page.getByRole('menu')).toHaveCount(0);
        });
      },
    },
    {
      id: 'unpin-button',
      change: { action: '압정 해제 버튼' },
      scenario: '점프 목록의 Blog에 마우스를 올려 오른쪽 끝에 나온 압정 해제 버튼을 누른다',
      result: '빠지고 점프 목록은 열려 있음',
      expected: ['Blog가 고정됨에서 빠지고 점프 목록은 열려 있다'],
      docs: ['[[작업 표시줄:우클릭 메뉴]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openJumpList(page);
        await page.getByRole('menuitem', { name: 'Blog' }).hover();
        // 압정 해제 버튼은 마우스 전용이라 접근성 트리에서 숨는다(`aria-hidden`).
        await page.locator(`button[aria-label="${UNPIN_LABEL}"]:visible`).click();
        await check('Blog가 고정됨에서 빠지고 점프 목록은 열려 있다', async () => {
          await expect.poll(() => readPinnedNames(page)).toEqual(['Project', 'About']);
          await expect(page.getByRole('menu')).toHaveCount(1);
        });
      },
    },
    {
      id: 'unpin-with-keyboard',
      change: { input: '키보드' },
      scenario:
        '작업 표시줄 탐색기 버튼에서 Shift+F10으로 점프 목록을 열고, Project에서 Shift+F10으로 연 항목 메뉴의 "이 목록에서 고정 해제"를 Enter로 고른다',
      result: '빠지고 점프 목록에 포커스',
      expected: [
        'Project가 고정됨에서 빠지고 점프 목록은 열려 있다',
        '포커스가 점프 목록으로 돌아와 방향키로 다음 항목에 간다',
      ],
      docs: ['[[작업 표시줄:우클릭 메뉴]]', '[[접근성:포커스]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).focus();
        await page.keyboard.press('Shift+F10');
        await expect(page.getByRole('group', { name: '고정됨' })).toBeVisible();
        await page.getByRole('menuitem', { name: 'Project' }).focus();
        await page.keyboard.press('Shift+F10');
        // 다른 우클릭 메뉴처럼 항목 메뉴는 팝업에 포커스를 두고 열린다. 첫 방향키가 열기, 다음이 고정 해제다.
        const itemMenu = page
          .getByRole('menu')
          .filter({ has: page.getByRole('menuitem', { name: UNPIN_LABEL }) });
        await expect(itemMenu).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('menuitem', { name: '열기' })).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('menuitem', { name: UNPIN_LABEL })).toBeFocused();
        await page.keyboard.press('Enter');
        await check('Project가 고정됨에서 빠지고 점프 목록은 열려 있다', async () => {
          await expect.poll(() => readPinnedNames(page)).toEqual(['Blog', 'About']);
          await expect(page.getByRole('menu')).toHaveCount(1);
        });
        await check('포커스가 점프 목록으로 돌아와 방향키로 다음 항목에 간다', async () => {
          await expect.poll(() => isFocusInMenu(page)).toBe(true);
          await page.keyboard.press('ArrowDown');
          await expect(page.getByRole('menuitem', { name: 'Blog' })).toBeFocused();
        });
      },
    },
    {
      id: 'unpin-with-touch',
      change: { input: '터치' },
      device: 'Pixel 7',
      scenario:
        '모바일에서 작업 표시줄 탐색기 버튼을 길게 눌러 연 점프 목록의 Project를 길게 누르고, 항목 메뉴의 "이 목록에서 고정 해제"를 탭한다',
      result: '길게 눌러 항목 메뉴·빠지고 점프 목록은 열려 있음',
      expected: [
        '길게 누르면 항목 메뉴가 뜨고 점프 목록은 열려 있다',
        '손을 뗀 뒤 따라오는 클릭이 Project 폴더를 열지 않는다',
        'Project가 고정됨에서 빠지고 점프 목록은 열려 있다',
      ],
      docs: ['[[작업 표시줄:우클릭 메뉴]]', '[[반응형:입력 차이]]'],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.longPress(page.getByRole('button', { name: '파일 탐색기' }));
        await expect(page.getByRole('group', { name: '고정됨' })).toBeVisible();

        await touch.longPress(page.getByRole('menuitem', { name: 'Project' }));
        const unpin = page.getByRole('menuitem', { name: UNPIN_LABEL });
        await check('길게 누르면 항목 메뉴가 뜨고 점프 목록은 열려 있다', async () => {
          await expect(unpin).toBeVisible();
          // 항목 메뉴가 열린 동안 점프 목록은 막혀(모달) 접근성 트리에서 숨는다.
          await expect(page.locator('[role="menu"]')).toHaveCount(2);
        });
        await check('손을 뗀 뒤 따라오는 클릭이 Project 폴더를 열지 않는다', async () => {
          await expect(page.getByRole('region', { name: /- 파일 탐색기$/ })).toHaveCount(0);
        });

        await touch.tap(unpin);
        await check('Project가 고정됨에서 빠지고 점프 목록은 열려 있다', async () => {
          await expect.poll(() => readPinnedNames(page)).toEqual(['Blog', 'About']);
          await expect(page.getByRole('menu')).toHaveCount(1);
        });
      },
    },
  ],
});
