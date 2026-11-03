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
      label: '입력 방식',
      values: ['마우스 클릭', '마우스 올리기', '키보드', '터치'],
      base: '마우스 클릭',
    },
    app: {
      label: '앱',
      values: ['파일 탐색기', 'Chrome'],
      base: '파일 탐색기',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'open-minimize-restore-close',
      scenario:
        '작업 표시줄의 파일 탐색기 버튼을 클릭해 창을 열고, 창의 최소화 버튼으로 숨긴 뒤 다시 버튼을 클릭하고, 창의 닫기 버튼을 누른다',
      expected: [
        '창이 없을 때 버튼을 클릭하면 바탕 화면 탐색기가 열린다',
        '최소화하면 창이 숨는다',
        '최소화된 창은 버튼을 클릭하면 복원된다',
        '닫기를 누르면 창이 사라진다',
      ],
      docs: ['[[작업 표시줄:앱 버튼]]', '[[창 동작:창 조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        const taskbarButton = page.getByRole('button', { name: '파일 탐색기' });
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });

        await taskbarButton.click();
        await check('창이 없을 때 버튼을 클릭하면 바탕 화면 탐색기가 열린다', async () => {
          await expect(explorer).toBeVisible();
        });

        await explorer.getByRole('button', { name: '최소화' }).click();
        await check('최소화하면 창이 숨는다', async () => {
          await expect(explorer).toBeHidden();
        });

        await taskbarButton.click();
        await check('최소화된 창은 버튼을 클릭하면 복원된다', async () => {
          await expect(explorer).toBeVisible();
        });

        await explorer.getByRole('button', { name: '닫기', exact: true }).click();
        await check('닫기를 누르면 창이 사라진다', async () => {
          await expect(explorer).not.toBeAttached();
        });
      },
    },
    {
      id: 'preview-list',
      change: { windows: '여러 개' },
      scenario:
        '탐색기 창을 바탕 화면과 Blog 두 개 열어 둔 채 작업 표시줄의 파일 탐색기 버튼을 클릭하고, 미리보기 목록에서 바탕 화면 창을 클릭한다',
      expected: [
        '같은 앱의 창이 둘이면 버튼이 창 미리보기 목록을 띄운다',
        '고른 바탕 화면 창이 맨 앞으로 온다',
        'Blog 창은 뒤로 간다',
      ],
      docs: ['[[작업 표시줄:앱 버튼]]', '[[작업 표시줄:창 미리보기]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(desktopWindow).toBeVisible();
        await openBlogFolder(page);
        const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        await expect(blog).toBeVisible();
        await expect(blog).toHaveAttribute('data-window-state', 'active');

        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const preview = page.getByRole('button', { name: '바탕 화면 - 파일 탐색기' });
        await check('같은 앱의 창이 둘이면 버튼이 창 미리보기 목록을 띄운다', async () => {
          await expect(preview).toBeVisible();
        });
        await preview.click();
        await check('고른 바탕 화면 창이 맨 앞으로 온다', async () => {
          await expect(desktopWindow).toHaveAttribute('data-window-state', 'active');
        });
        await check('Blog 창은 뒤로 간다', async () => {
          await expect(blog).toHaveAttribute('data-window-state', 'inactive');
        });
      },
    },
  ],
});
