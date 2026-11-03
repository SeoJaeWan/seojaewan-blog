import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '작업 표시줄 앱 버튼을 누른다',
  area: '작업 표시줄',
  conditions: {
    windows: {
      label: '그 앱의 창',
      values: ['없음', '1개이고 맨 앞', '1개이고 뒤에 있거나 최소화됨', '여러 개'],
      base: '없음',
    },
    input: {
      label: '입력',
      values: ['클릭', '마우스 올리기', '키보드', '터치'],
      base: '클릭',
    },
    app: {
      label: '앱',
      values: ['파일 탐색기', 'Chrome'],
      base: '파일 탐색기',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'open-minimize-restore-close',
      purpose: '작업 표시줄에서 탐색기를 열고, 최소화했다가 작업 표시줄 버튼으로 복원한 뒤 닫는다',
      docs: ['[[작업 표시줄:앱 버튼]]', '[[창 동작:창 조작]]'],
      async run({ page }) {
        await page.goto('/');
        const taskbarButton = page.getByRole('button', { name: '파일 탐색기' });
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });

        await taskbarButton.click();
        await expect(explorer).toBeVisible();

        await explorer.getByRole('button', { name: '최소화' }).click();
        await expect(explorer).toBeHidden();

        await taskbarButton.click();
        await expect(explorer).toBeVisible();

        await explorer.getByRole('button', { name: '닫기', exact: true }).click();
        await expect(explorer).not.toBeAttached();
      },
    },
    {
      id: 'preview-list',
      change: { windows: '여러 개' },
      purpose: '같은 앱의 창이 둘이면 앱 버튼이 미리보기 목록을 띄우고, 고른 창이 앞으로 온다',
      docs: ['[[작업 표시줄:앱 버튼]]', '[[작업 표시줄:창 미리보기]]'],
      async run({ page }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(desktopWindow).toBeVisible();
        await openBlogFolder(page);
        const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        await expect(blog).toBeVisible();
        await expect(blog).toHaveAttribute('data-window-state', 'active');

        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await page.getByRole('button', { name: '바탕 화면 - 파일 탐색기' }).click();
        await expect(desktopWindow).toHaveAttribute('data-window-state', 'active');
        await expect(blog).toHaveAttribute('data-window-state', 'inactive');
      },
    },
  ],
});
