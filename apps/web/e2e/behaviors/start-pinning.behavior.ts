import { expect } from '@playwright/test';

import { restart } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '시작 화면 고정을 바꾼다',
  area: 'Start',
  conditions: {
    from: {
      label: '메뉴를 연 곳',
      values: ['Start 모두 목록', 'Start 고정됨', '바탕화면 아이콘', '탐색기 항목'],
      base: 'Start 모두 목록',
    },
    action: {
      label: '조작',
      values: ['고정 해제', '고정', '맨 앞으로 이동', '끌어서 순서 바꾸기'],
      base: '고정 해제',
    },
    after: {
      label: '그 뒤',
      values: ['없음', '새로고침', '다시 시작'],
      base: '없음',
    },
    trash: {
      label: '고정한 항목',
      values: ['그대로', '휴지통에 들어감', '복원됨'],
      base: '그대로',
    },
  },
  cases: [
    {
      id: 'unpin-from-all-list',
      purpose: 'Start 모두 목록의 줄을 우클릭해 시작 화면 고정을 해제하면 고정됨에서 빠진다',
      docs: ['[[Start 메뉴:모두]]', '[[고정:시작 화면 고정]]'],
      async run({ page }) {
        await page.goto('/');

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        const pinned = startMenu.getByRole('region', { name: '고정됨' });
        const all = startMenu.getByRole('region', { name: '모두' });
        await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
        await expect(all.getByRole('button', { name: '보기: 범주' })).toBeVisible();

        await all.getByRole('button', { name: 'Blog', exact: true }).click({ button: 'right' });
        await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();

        await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
        await expect(startMenu).toBeVisible();
      },
    },
    {
      id: 'desktop-repin-reload-restart',
      change: { from: '바탕화면 아이콘', after: '새로고침' },
      purpose:
        '바탕화면에서 고정을 해제했다가 다시 고정하면 고정됨 맨 뒤에 붙고 새로고침 뒤에도 남으며, 다시 시작하면 처음 순서로 돌아간다',
      docs: [
        '[[고정:시작 화면 고정]]',
        '[[방문자 저장:저장하는 것]]',
        '[[다시 시작:되돌리는 상태]]',
      ],
      async run({ page }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const pinned = page
          .getByRole('dialog', { name: '시작' })
          .getByRole('region', { name: '고정됨' });
        const blog = icons.getByRole('option', { name: 'Blog' });

        await blog.click({ button: 'right' });
        await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();
        await page.getByRole('button', { name: '시작' }).click();
        await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
        await page.keyboard.press('Escape');

        await blog.click({ button: 'right' });
        await page.getByRole('menuitem', { name: '시작 화면에 고정' }).click();
        await page.getByRole('button', { name: '시작' }).click();
        await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
        await page.keyboard.press('Escape');

        await page.reload();
        await page.getByRole('button', { name: '시작' }).click();
        await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
        await page.keyboard.press('Escape');

        await restart(page);
        await page.getByRole('button', { name: '시작' }).click();
        await expect(pinned.getByRole('button').last()).toHaveAccessibleName('GitHub');
        await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
      },
    },
  ],
});
