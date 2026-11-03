import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면 아이콘을 끌어 옮긴다',
  area: '바탕화면',
  conditions: {
    drop: {
      label: '놓는 곳',
      values: ['폴더', '휴지통', '탐색기 창', '빈 칸', '옮길 수 없는 곳', '놓을 곳이 아닌 곳'],
      base: '폴더',
    },
    selection: {
      label: '고른 아이콘',
      values: ['하나', '여러 개'],
      base: '하나',
    },
    autoArrange: {
      label: '자동 정렬',
      values: ['켜짐', '꺼짐'],
      base: '켜짐',
    },
    input: {
      label: '입력',
      values: ['마우스', '펜', '터치'],
      base: '마우스',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'drop-on-folder',
      purpose: '아이콘을 끌어 폴더 위에 놓으면 그 폴더로 들어간다',
      docs: ['[[항목 조작:끌기]]', '[[바탕화면:표시하는 항목]]'],
      async run({ page }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const github = icons.getByRole('option', { name: 'GitHub' });
        await github.dragTo(icons.getByRole('option', { name: 'Blog' }));
        await expect(github).not.toBeAttached();

        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        await expect(
          page.getByRole('region', { name: 'Blog - 파일 탐색기' }).getByText('GitHub'),
        ).toBeVisible();
      },
    },
    {
      id: 'touch-drag-does-not-move',
      change: { input: '터치', screen: '모바일' },
      device: 'Pixel 7',
      purpose: '모바일에서 아이콘을 터치로 끌어 폴더 위에 놓아도 옮겨지지 않는다',
      docs: ['[[반응형:입력 차이]]', '[[바탕화면 아이콘:모바일]]'],
      async run({ page, touch }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const github = icons.getByRole('option', { name: 'GitHub' });
        const blog = icons.getByRole('option', { name: 'Blog' });
        const before = await github.boundingBox();

        await touch.swipe(github, blog);
        await expect(github).toBeVisible();
        expect(await github.boundingBox()).toEqual(before);

        await touch.tap(blog);
        const content = page
          .getByRole('region', { name: 'Blog - 파일 탐색기' })
          .getByRole('listbox', { name: '폴더 내용' });
        await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();
        await expect(content.getByRole('option', { name: 'GitHub' })).toHaveCount(0);
      },
    },
  ],
});
