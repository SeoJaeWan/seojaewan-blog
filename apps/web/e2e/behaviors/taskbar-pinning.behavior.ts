import { expect } from '@playwright/test';

import { restart } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '작업 표시줄 고정을 바꾼다',
  area: '작업 표시줄',
  conditions: {
    action: {
      label: '조작',
      values: ['고정 해제', '고정', '끌어서 순서 바꾸기'],
      base: '고정 해제',
    },
    from: {
      label: '메뉴를 연 곳',
      values: ['작업 표시줄 앱 버튼', 'Start 모두 목록'],
      base: '작업 표시줄 앱 버튼',
    },
    window: {
      label: '그 앱의 창',
      values: ['열었다 닫음', '열려 있음', '없음'],
      base: '열었다 닫음',
    },
    after: {
      label: '그 뒤',
      values: ['없음', '새로고침', '다시 시작'],
      base: '다시 시작',
    },
  },
  cases: [
    {
      id: 'unpin-shows-while-open',
      purpose:
        '작업 표시줄의 고정을 해제한 앱은 창이 열려 있는 동안만 보이고, 새로고침 뒤에도 해제된 채이며, 다시 시작하면 고정이 돌아온다',
      docs: [
        '[[작업 표시줄:고정과 순서]]',
        '[[작업 표시줄:우클릭 메뉴]]',
        '[[고정:작업 표시줄 고정]]',
      ],
      async run({ page }) {
        await page.goto('/');
        const taskbarChrome = page.getByRole('button', { name: 'Chrome' });
        await taskbarChrome.click({ button: 'right' });
        await page.getByRole('menuitem', { name: '작업 표시줄에서 고정 해제' }).click();
        await expect(taskbarChrome).toBeHidden();

        await page.goto('/posts/react-19-hooks');
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await expect(taskbarChrome).toBeVisible();

        await chrome.getByRole('button', { name: '닫기', exact: true }).click();
        await expect(chrome).not.toBeAttached();
        await expect(taskbarChrome).toBeHidden();

        await page.reload();
        await expect(page.getByRole('button', { name: '파일 탐색기' })).toBeVisible();
        await expect(taskbarChrome).toBeHidden();

        await restart(page);
        await expect(taskbarChrome).toBeVisible();
      },
    },
  ],
});
