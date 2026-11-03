import { expect } from '@playwright/test';

import { readWorkspaceStorage, WORKSPACE_STORAGE_KEY } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '다시 시작한다',
  area: '공통',
  conditions: {
    state: {
      label: '바꿔 둔 상태',
      values: ['열린 창', '폴더·배치', '휴지통', '고정 목록·순서', '바탕화면 설정'],
      base: '열린 창',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'closes-windows',
      scenario: '파일 탐색기 창을 연 채 시작 버튼의 전원 메뉴에서 다시 시작을 고른다',
      expected: [
        '재부팅 화면이 보였다 사라진다',
        '열려 있던 탐색기 창이 닫힌다',
        'Start 메뉴가 닫혀 있다',
      ],
      docs: ['[[다시 시작:순서]]'],
      async run({ page, check }) {
        await page.goto('/');
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await expect(explorer).toBeVisible();

        await page.getByRole('button', { name: '시작' }).click();
        await page
          .getByRole('dialog', { name: '시작' })
          .getByRole('button', { name: '전원' })
          .click();
        await page.getByRole('menuitem', { name: '다시 시작' }).click();

        const bootScreen = page.getByRole('progressbar', { name: '다시 시작하는 중' });
        await check('재부팅 화면이 보였다 사라진다', async () => {
          await expect(bootScreen).toBeVisible();
          await expect(bootScreen).not.toBeAttached();
        });
        await check('열려 있던 탐색기 창이 닫힌다', async () => {
          await expect(explorer).not.toBeAttached();
        });
        await check('Start 메뉴가 닫혀 있다', async () => {
          await expect(page.getByRole('dialog', { name: '시작' })).not.toBeAttached();
        });
      },
    },
    {
      id: 'resets-saved-workspace',
      change: { state: '폴더·배치' },
      scenario:
        'Blog 폴더 이름이 내 블로그로 저장된 상태에서 새로고침한 뒤, 시작 버튼의 전원 메뉴에서 다시 시작을 고른다',
      expected: [
        '새로고침 뒤에도 저장한 이름 내 블로그가 남는다',
        '다시 시작하면 폴더 이름이 Blog로 돌아온다',
        '브라우저에 저장한 작업 공간이 지워진다',
      ],
      docs: ['[[방문자 저장:저장하는 것]]', '[[다시 시작:되돌리는 상태]]'],
      async run({ page, check }) {
        await page.goto('/');
        const desktop = page.getByRole('main', { name: '바탕화면' });
        // 항목을 열면 최근 항목이 바뀌어 저장분이 생긴다.
        await desktop.getByText('Blog', { exact: true }).dblclick();
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await expect.poll(() => readWorkspaceStorage(page)).not.toBeNull();

        // 방문자가 Blog 폴더 이름을 바꾼 것처럼 저장분을 고친다.
        await page.evaluate((key) => {
          const stored = localStorage.getItem(key) ?? '';
          localStorage.setItem(key, stored.replace('"name":"Blog"', '"name":"내 블로그"'));
        }, WORKSPACE_STORAGE_KEY);
        await page.reload();
        await check('새로고침 뒤에도 저장한 이름 내 블로그가 남는다', async () => {
          await expect(desktop.getByText('내 블로그', { exact: true })).toBeVisible();
        });

        await page.getByRole('button', { name: '시작' }).click();
        await page
          .getByRole('dialog', { name: '시작' })
          .getByRole('button', { name: '전원' })
          .click();
        await page.getByRole('menuitem', { name: '다시 시작' }).click();
        await expect(
          page.getByRole('progressbar', { name: '다시 시작하는 중' }),
        ).not.toBeAttached();

        await check('다시 시작하면 폴더 이름이 Blog로 돌아온다', async () => {
          await expect(desktop.getByText('Blog', { exact: true })).toBeVisible();
          await expect(desktop.getByText('내 블로그', { exact: true })).not.toBeAttached();
        });
        await check('브라우저에 저장한 작업 공간이 지워진다', async () => {
          expect(await readWorkspaceStorage(page)).toBeNull();
        });
      },
    },
  ],
});
