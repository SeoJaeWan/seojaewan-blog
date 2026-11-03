import { expect } from '@playwright/test';

import { restart } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '작업 표시줄 고정을 바꾼다',
  area: '작업 표시줄',
  conditions: {
    action: {
      label: '고정 조작',
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
      label: '그다음에',
      values: ['없음', '새로고침', '다시 시작'],
      base: '다시 시작',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'unpin-shows-while-open',
      scenario:
        '작업 표시줄 Chrome 버튼을 우클릭해 고정을 해제하고, Chrome 창을 열었다 닫은 뒤, 전원 메뉴로 다시 시작한다',
      expected: [
        '고정을 해제하면 Chrome 버튼이 작업 표시줄에서 사라진다',
        'Chrome 창이 열려 있는 동안은 Chrome 버튼이 보인다',
        'Chrome 창을 모두 닫으면 Chrome 버튼이 다시 사라진다',
        '다시 시작하면 Chrome 고정이 돌아온다',
      ],
      docs: [
        '[[작업 표시줄:고정과 순서]]',
        '[[작업 표시줄:우클릭 메뉴]]',
        '[[고정:작업 표시줄 고정]]',
        '[[다시 시작:되돌리는 상태]]',
      ],
      async run({ page, check }) {
        await page.goto('/');
        const taskbarChrome = page.getByRole('button', { name: 'Chrome' });
        await taskbarChrome.click({ button: 'right' });
        await page.getByRole('menuitem', { name: '작업 표시줄에서 고정 해제' }).click();
        await check('고정을 해제하면 Chrome 버튼이 작업 표시줄에서 사라진다', async () => {
          await expect(taskbarChrome).toBeHidden();
        });

        await page.goto('/posts/react-19-hooks');
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await check('Chrome 창이 열려 있는 동안은 Chrome 버튼이 보인다', async () => {
          await expect(taskbarChrome).toBeVisible();
        });

        await chrome.getByRole('button', { name: '닫기', exact: true }).click();
        await expect(chrome).not.toBeAttached();
        await check('Chrome 창을 모두 닫으면 Chrome 버튼이 다시 사라진다', async () => {
          await expect(taskbarChrome).toBeHidden();
        });

        await restart(page);
        await check('다시 시작하면 Chrome 고정이 돌아온다', async () => {
          await expect(taskbarChrome).toBeVisible();
        });
      },
    },
    {
      id: 'unpin-stays-after-reload',
      change: { window: '없음', after: '새로고침' },
      scenario:
        '작업 표시줄 Chrome 버튼을 우클릭해 고정을 해제하고 Chrome 창을 연 적 없이 페이지를 새로고침한다',
      expected: [
        '고정을 해제하면 Chrome 버튼이 작업 표시줄에서 사라진다',
        '새로고침 뒤에도 Chrome 고정은 해제된 채다',
      ],
      docs: [
        '[[작업 표시줄:고정과 순서]]',
        '[[고정:작업 표시줄 고정]]',
        '[[방문자 저장:저장하는 것]]',
      ],
      async run({ page, check }) {
        await page.goto('/');
        const taskbarChrome = page.getByRole('button', { name: 'Chrome' });
        await taskbarChrome.click({ button: 'right' });
        await page.getByRole('menuitem', { name: '작업 표시줄에서 고정 해제' }).click();
        await check('고정을 해제하면 Chrome 버튼이 작업 표시줄에서 사라진다', async () => {
          await expect(taskbarChrome).toBeHidden();
        });

        await page.reload();
        await expect(page.getByRole('button', { name: '파일 탐색기' })).toBeVisible();
        await check('새로고침 뒤에도 Chrome 고정은 해제된 채다', async () => {
          await expect(taskbarChrome).toBeHidden();
        });
      },
    },
  ],
});
