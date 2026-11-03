import { expect, type Page } from '@playwright/test';

import { restart } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

/**
 * Start 메뉴를 열고 모두 목록 Blog 줄의 우클릭 메뉴로 시작 화면 고정을 해제했다가 다시 고정한다.
 * 해제한 직후 고정됨에 Blog가 없는지 기다려 확인한다.
 * @param page 앱 페이지
 */
async function unpinAndRepinBlogFromAllList(page: Page): Promise<void> {
  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  const pinned = startMenu.getByRole('region', { name: '고정됨' });
  const all = startMenu.getByRole('region', { name: '모두' });
  const blog = all.getByRole('button', { name: 'Blog', exact: true });
  await expect(all.getByRole('button', { name: '보기: 범주' })).toBeVisible();

  await blog.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();
  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();

  await blog.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '시작 화면에 고정' }).click();
  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(startMenu).toBeHidden();
}

export const behavior = defineBehavior({
  name: '시작 화면 고정을 바꾼다',
  area: 'Start',
  summary: '해제·바탕화면에서 해제·맨 뒤에 붙음·순서 남음·처음 순서로',
  conditions: {
    from: {
      label: '메뉴를 연 곳',
      values: ['Start 모두 목록', 'Start 고정됨', '바탕화면 아이콘', '탐색기 항목'],
      base: 'Start 모두 목록',
    },
    action: {
      label: '고정 조작',
      values: ['고정 해제', '고정', '맨 앞으로 이동', '끌어서 순서 바꾸기'],
      base: '고정 해제',
    },
    after: {
      label: '그다음에',
      values: ['없음', '새로고침', '다시 시작'],
      base: '없음',
    },
    trash: {
      label: '고정한 항목의 휴지통 상태',
      values: ['그대로', '휴지통에 들어감', '복원됨'],
      base: '그대로',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'unpin-from-all-list',
      scenario:
        'Start 메뉴를 열고 모두 목록의 Blog 줄을 우클릭해 메뉴의 시작 화면에서 고정 해제를 누른다',
      result: '고정됨에서 빠짐',
      expected: ['고정됨에서 Blog가 사라진다', 'Start 메뉴는 열려 있다'],
      docs: ['[[Start 메뉴:모두]]', '[[고정:시작 화면 고정]]'],
      async run({ page, check }) {
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        const pinned = startMenu.getByRole('region', { name: '고정됨' });
        const all = startMenu.getByRole('region', { name: '모두' });
        await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
        await expect(all.getByRole('button', { name: '보기: 범주' })).toBeVisible();

        await all.getByRole('button', { name: 'Blog', exact: true }).click({ button: 'right' });
        await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();

        await check('고정됨에서 Blog가 사라진다', async () => {
          await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
        });
        await check('Start 메뉴는 열려 있다', async () => {
          await expect(startMenu).toBeVisible();
        });
      },
    },
    {
      id: 'unpin-from-desktop',
      change: { from: '바탕화면 아이콘' },
      scenario:
        '바탕화면 Blog 아이콘을 우클릭해 메뉴의 시작 화면에서 고정 해제를 누르고 Start 메뉴를 연다',
      result: '바탕화면에서 고정 해제됨',
      expected: ['고정됨에서 Blog가 사라진다'],
      docs: ['[[고정:시작 화면 고정]]', '[[바탕화면 우클릭 메뉴:아이콘]]'],
      async run({ page, check }) {
        await page.goto('/');
        const pinned = page
          .getByRole('dialog', { name: '시작' })
          .getByRole('region', { name: '고정됨' });

        await page
          .getByRole('listbox', { name: '바탕화면 아이콘' })
          .getByRole('option', { name: 'Blog' })
          .click({ button: 'right' });
        await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();
        await page.getByRole('button', { name: '시작' }).click();
        await check('고정됨에서 Blog가 사라진다', async () => {
          await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
        });
      },
    },
    {
      id: 'repin-from-all-list',
      change: { action: '고정' },
      scenario:
        'Start 모두 목록의 Blog 줄 우클릭 메뉴로 시작 화면 고정을 해제하고, 같은 줄의 우클릭 메뉴로 다시 고정한 뒤 Start 메뉴를 다시 연다',
      result: '맨 뒤에 다시 붙음',
      expected: ['다시 고정한 Blog가 고정됨 맨 뒤에 붙는다'],
      docs: ['[[Start 메뉴:모두]]', '[[고정:시작 화면 고정]]'],
      async run({ page, check }) {
        await page.goto('/');
        const pinned = page
          .getByRole('dialog', { name: '시작' })
          .getByRole('region', { name: '고정됨' });
        await unpinAndRepinBlogFromAllList(page);

        await page.getByRole('button', { name: '시작' }).click();
        await check('다시 고정한 Blog가 고정됨 맨 뒤에 붙는다', async () => {
          await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
        });
      },
    },
    {
      id: 'repin-then-reload',
      change: { after: '새로고침' },
      combine: {
        change: { action: '고정' },
        reason:
          '고정 해제만으로는 고정됨 순서가 바뀌지 않아, 다시 고정해 순서를 바꿔야 새로고침 뒤 순서가 남는지 드러난다',
      },
      scenario:
        'Start 모두 목록의 Blog 줄 우클릭 메뉴로 고정을 해제했다가 다시 고정한 뒤 페이지를 새로고침하고 Start 메뉴를 연다',
      result: '새로고침 뒤 순서 남음',
      expected: ['새로고침 뒤에도 Blog가 고정됨 맨 뒤에 남아 있다'],
      docs: ['[[고정:시작 화면 고정]]', '[[방문자 저장:저장하는 것]]'],
      async run({ page, check }) {
        await page.goto('/');
        const pinned = page
          .getByRole('dialog', { name: '시작' })
          .getByRole('region', { name: '고정됨' });
        await unpinAndRepinBlogFromAllList(page);

        await page.reload();
        await page.getByRole('button', { name: '시작' }).click();
        await check('새로고침 뒤에도 Blog가 고정됨 맨 뒤에 남아 있다', async () => {
          await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
        });
      },
    },
    {
      id: 'repin-then-restart',
      change: { after: '다시 시작' },
      combine: {
        change: { action: '고정' },
        reason:
          '고정 해제만으로는 고정됨 순서가 바뀌지 않아, 다시 고정해 순서를 바꿔야 다시 시작이 처음 순서로 되돌리는지 드러난다',
      },
      scenario:
        'Start 모두 목록의 Blog 줄 우클릭 메뉴로 고정을 해제했다가 다시 고정한 뒤 전원 메뉴로 다시 시작하고 Start 메뉴를 연다',
      result: '처음 순서로 돌아감',
      expected: [
        '다시 시작하면 고정됨 순서가 처음으로 돌아가 GitHub이 맨 뒤에 있다',
        'Blog는 고정됨에 있다',
      ],
      docs: ['[[고정:시작 화면 고정]]', '[[다시 시작:되돌리는 상태]]'],
      async run({ page, check }) {
        await page.goto('/');
        const pinned = page
          .getByRole('dialog', { name: '시작' })
          .getByRole('region', { name: '고정됨' });
        await unpinAndRepinBlogFromAllList(page);

        await restart(page);
        await page.getByRole('button', { name: '시작' }).click();
        await check(
          '다시 시작하면 고정됨 순서가 처음으로 돌아가 GitHub이 맨 뒤에 있다',
          async () => {
            await expect(pinned.getByRole('button').last()).toHaveAccessibleName('GitHub');
          },
        );
        await check('Blog는 고정됨에 있다', async () => {
          await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
        });
      },
    },
  ],
});
