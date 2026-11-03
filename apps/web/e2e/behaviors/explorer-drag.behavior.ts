import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기 항목을 끌어 옮기고 찾는다',
  area: '탐색기',
  conditions: {
    drop: {
      label: '놓는 곳',
      values: ['탐색 창의 폴더', '같은 창의 폴더', '다른 탐색기 창', '바탕화면', '옮길 수 없는 곳'],
      base: '탐색 창의 폴더',
    },
    view: {
      label: '보기',
      values: ['보통 아이콘', '큰 아이콘', '자세히'],
      base: '보통 아이콘',
    },
    search: {
      label: '이어서 찾기',
      values: ['한글 초성', '이름에 포함', '안 찾음'],
      base: '한글 초성',
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
      id: 'drag-to-tree-and-search',
      purpose: '탐색기 항목을 탐색 창 폴더로 끌어 옮기고, 폴더 안에서 초성으로 찾는다',
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:폴더 안 검색]]'],
      async run({ page }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        const tree = explorer.getByRole('tree', { name: '탐색 창' });

        await content
          .getByRole('option', { name: '2026 상반기 회고', exact: true })
          .dragTo(tree.getByRole('treeitem', { name: 'Next.js' }));
        await expect(
          content.getByRole('option', { name: '2026 상반기 회고', exact: true }),
        ).not.toBeAttached();

        await explorer.getByRole('searchbox', { name: '검색' }).fill('ㅎㄱ');
        await expect(content.getByRole('option', { name: /^2026 상반기 회고/ })).toBeVisible();
        await expect(explorer.getByRole('button', { name: '위치' })).toBeVisible();
      },
    },
    {
      id: 'touch-drag-does-not-move',
      change: { drop: '같은 창의 폴더', search: '안 찾음', input: '터치', screen: '모바일' },
      device: 'Pixel 7',
      purpose: '모바일 탐색기에서 항목을 터치로 끌어 폴더 위에 놓아도 옮겨지지 않는다',
      docs: ['[[반응형:입력 차이]]', '[[파일 탐색기:모바일]]'],
      async run({ page, touch }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        const post = content.getByRole('option', { name: '2026 상반기 회고', exact: true });
        await expect(post).toBeVisible();

        await touch.swipe(post, content.getByRole('option', { name: 'Next.js', exact: true }));
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await expect(post).toBeVisible();
      },
    },
  ],
});
