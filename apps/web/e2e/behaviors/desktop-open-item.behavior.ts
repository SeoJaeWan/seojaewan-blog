import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면 항목을 연다',
  area: '바탕화면',
  conditions: {
    item: {
      label: '항목',
      values: ['폴더', '휴지통', '글', '외부 링크'],
      base: '폴더',
    },
    input: {
      label: '입력',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
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
      id: 'folder-double-click',
      purpose: '바탕화면의 Blog 폴더를 더블클릭하면 탐색기 창이 열린다',
      docs: ['[[항목 조작:열기]]', '[[창 동작:열기 규칙]]'],
      async run({ page }) {
        await page.goto('/');
        await page
          .getByRole('main', { name: '바탕화면' })
          .getByText('Blog', { exact: true })
          .dblclick();
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
      },
    },
    {
      id: 'recycle-bin',
      change: { item: '휴지통' },
      purpose: '바탕화면의 Blog 폴더와 휴지통을 열면 그 위치를 보는 탐색기 창이 열린다',
      docs: ['[[창 동작:열기 규칙]]'],
      async run({ page }) {
        await page.goto('/');
        const desktop = page.getByRole('main', { name: '바탕화면' });

        await desktop.getByText('Blog', { exact: true }).dblclick();
        const blog = page
          .getByRole('region', { name: 'Blog - 파일 탐색기' })
          .getByRole('listbox', { name: '폴더 내용' });
        await expect(blog.getByText('Notion 블로그 이전기')).toBeVisible();
        await expect(blog.getByText('React', { exact: true })).toBeVisible();

        await desktop
          .getByRole('listbox', { name: '바탕화면 아이콘' })
          .getByRole('option', { name: '휴지통' })
          .dblclick();
        await expect(page.getByRole('region', { name: '휴지통 - 파일 탐색기' })).toBeVisible();
      },
    },
    {
      id: 'touch-tap',
      change: { input: '터치', screen: '모바일' },
      device: 'Pixel 7',
      purpose: '모바일에서 바탕화면 폴더를 한 번 탭하면 바로 그 폴더를 보는 탐색기 창이 열린다',
      docs: ['[[반응형:입력 차이]]', '[[창 동작:모바일]]'],
      async run({ page, touch }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        await expect(explorer).toBeVisible();
        await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(412);
      },
    },
  ],
});
