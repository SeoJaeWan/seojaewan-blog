import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면 항목을 연다',
  area: '바탕화면',
  summary: '폴더·휴지통이 열림·탭 한 번으로 열림',
  conditions: {
    item: {
      label: '연 항목',
      values: ['폴더', '휴지통', '글', '외부 링크'],
      base: '폴더',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
    },
    how: {
      label: '여는 방법',
      values: ['열기', '새 창에서 열기'],
      base: '열기',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  requires: [{ when: { input: '터치' }, then: { screen: '모바일' } }],
  cases: [
    {
      id: 'folder-double-click',
      result: 'Blog 탐색기 창이 열림',
      scenario: '바탕화면의 Blog 폴더 아이콘을 마우스로 더블클릭한다',
      expected: ['Blog 탐색기 창이 열린다', '창에 Blog 폴더의 글과 하위 폴더가 보인다'],
      docs: ['[[항목 조작:열기]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page
          .getByRole('main', { name: '바탕화면' })
          .getByText('Blog', { exact: true })
          .dblclick();
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        await check('Blog 탐색기 창이 열린다', async () => {
          await expect(explorer).toBeVisible();
        });
        await check('창에 Blog 폴더의 글과 하위 폴더가 보인다', async () => {
          const blog = explorer.getByRole('listbox', { name: '폴더 내용' });
          await expect(blog.getByText('Notion 블로그 이전기')).toBeVisible();
          await expect(blog.getByText('React', { exact: true })).toBeVisible();
        });
      },
    },
    {
      id: 'recycle-bin',
      result: '휴지통 창이 열림',
      change: { item: '휴지통' },
      scenario: '바탕화면의 휴지통 아이콘을 마우스로 더블클릭한다',
      expected: ['휴지통 탐색기 창이 열린다'],
      docs: ['[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page
          .getByRole('main', { name: '바탕화면' })
          .getByRole('listbox', { name: '바탕화면 아이콘' })
          .getByRole('option', { name: '휴지통' })
          .dblclick();
        await check('휴지통 탐색기 창이 열린다', async () => {
          await expect(page.getByRole('region', { name: '휴지통 - 파일 탐색기' })).toBeVisible();
        });
      },
    },
    {
      id: 'touch-tap',
      result: '한 번 탭에 전체 너비로 열림',
      change: { input: '터치' },
      device: 'Pixel 7',
      scenario: '모바일에서 바탕화면의 Blog 폴더 아이콘을 손가락으로 한 번 탭한다',
      expected: ['한 번 탭하면 Blog 탐색기 창이 열린다', '창이 화면 전체 너비(412)를 채운다'],
      docs: ['[[반응형:입력 차이]]', '[[창 동작:모바일]]'],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        await check('한 번 탭하면 Blog 탐색기 창이 열린다', async () => {
          await expect(explorer).toBeVisible();
        });
        await check('창이 화면 전체 너비(412)를 채운다', async () => {
          await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(412);
        });
      },
    },
  ],
});
