import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기에서 글을 연다',
  area: '탐색기',
  conditions: {
    chrome: {
      label: '열린 Chrome 창',
      values: ['없음', '있음', '최소화됨'],
      base: '없음',
    },
    again: {
      label: '같은 글',
      values: ['다시 엶', '처음 엶'],
      base: '다시 엶',
    },
    how: {
      label: '여는 법',
      values: ['열기', '새 창에서 열기'],
      base: '열기',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'open-and-reopen',
      purpose:
        '바탕화면 Blog 폴더에서 폴더를 지나 글을 열면 Chrome 창에 열려 주소가 바뀌고, 같은 글을 다시 열면 같은 창의 새 탭이 된다',
      docs: ['[[창 동작:열기 규칙]]', '[[파일 탐색기:조작]]'],
      async run({ page }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).dblclick();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();

        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);

        // 탐색기를 앞으로 가져와 같은 글을 다시 연다.
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        await expect(chrome.getByRole('tab', { name: /React 19 훅 정리/ })).toHaveCount(2);
      },
    },
    {
      id: 'mobile-full-screen',
      change: { screen: '모바일', again: '처음 엶' },
      purpose:
        '모바일에서 탐색기로 글을 열면 전체화면 Chrome이 열리고, 작업 표시줄 앱 버튼으로 창을 오가며, 검색 버튼으로 글을 연다',
      docs: ['[[창 동작:모바일]]', '[[작업 표시줄:모바일]]', '[[검색:모바일]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page
          .getByRole('listbox', { name: '바탕화면 아이콘' })
          .getByRole('option', { name: 'Blog' })
          .click();
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        await expect(explorer).toBeVisible();
        await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(390);

        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).click();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).click();
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(390);
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);

        // 창은 하나만 보인다. 탐색기 버튼을 누르면 탐색기가 앞으로 온다.
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        await expect(chrome).toHaveAttribute('data-window-state', 'inactive');
        await expect(page).toHaveURL(/\/$/);

        // 검색 패널 안의 입력칸으로 글을 찾아 연다.
        await page.getByRole('button', { name: '검색', expanded: false }).click();
        const panel = page.getByRole('dialog', { name: '검색' });
        await panel.getByRole('searchbox', { name: '검색' }).fill('app router');
        await panel.getByRole('searchbox', { name: '검색' }).press('Enter');
        await expect(panel).toBeHidden();
        await expect(
          page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
      },
    },
  ],
});
