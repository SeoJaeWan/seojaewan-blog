import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기 항목을 끌어 옮기고 찾는다',
  area: '탐색기',
  summary: '탐색 창 폴더로 옮김·초성으로 찾음·터치로는 안 옮겨짐',
  conditions: {
    drop: {
      label: '놓는 곳',
      values: ['탐색 창의 폴더', '같은 창의 폴더', '다른 탐색기 창', '바탕화면', '옮길 수 없는 곳'],
      base: '탐색 창의 폴더',
    },
    view: {
      label: '보기 방식',
      values: ['보통 아이콘', '큰 아이콘', '자세히'],
      base: '보통 아이콘',
    },
    search: {
      label: '옮긴 뒤 찾기',
      values: ['한글 초성', '이름에 포함', '안 찾음'],
      base: '한글 초성',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '펜', '터치'],
      base: '마우스',
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
      id: 'drag-to-tree-and-search',
      result: '옮겨지고 초성으로 찾아짐',
      scenario:
        'Blog 폴더 탐색기의 "2026 상반기 회고" 글을 마우스로 끌어 왼쪽 탐색 창의 Next.js 폴더에 놓고, 검색 상자에 "ㅎㄱ"을 입력한다',
      expected: [
        '글이 Blog 폴더 내용에서 사라진다',
        '초성 "ㅎㄱ"으로 "2026 상반기 회고"가 찾아진다',
        '검색 결과에 "위치" 열이 보인다',
      ],
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:폴더 안 검색]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        const tree = explorer.getByRole('tree', { name: '탐색 창' });

        await content
          .getByRole('option', { name: '2026 상반기 회고', exact: true })
          .dragTo(tree.getByRole('treeitem', { name: 'Next.js' }));
        await check('글이 Blog 폴더 내용에서 사라진다', async () => {
          await expect(
            content.getByRole('option', { name: '2026 상반기 회고', exact: true }),
          ).not.toBeAttached();
        });

        await explorer.getByRole('searchbox', { name: '검색' }).fill('ㅎㄱ');
        await check('초성 "ㅎㄱ"으로 "2026 상반기 회고"가 찾아진다', async () => {
          await expect(content.getByRole('option', { name: /^2026 상반기 회고/ })).toBeVisible();
        });
        await check('검색 결과에 "위치" 열이 보인다', async () => {
          await expect(explorer.getByRole('button', { name: '위치' })).toBeVisible();
        });
      },
    },
    {
      id: 'touch-drag-does-not-move',
      result: '끌어도 제자리',
      change: { input: '터치' },
      combine: {
        change: { drop: '같은 창의 폴더', search: '안 찾음' },
        reason:
          '모바일 탐색기에는 왼쪽 탐색 창이 없어 같은 창의 폴더로 끌고, 터치 케이스는 옮긴 뒤 찾는 단계를 하지 않는다',
      },
      device: 'Pixel 7',
      scenario:
        '모바일에서 Blog 폴더를 탭해 연 탐색기의 "2026 상반기 회고" 글을 손가락으로 끌어 Next.js 폴더 위에서 뗀다',
      expected: ['창이 Blog 폴더에 그대로 있다', '글이 제자리에 남는다'],
      docs: ['[[반응형:입력 차이]]', '[[파일 탐색기:모바일]]'],
      async run({ page, touch, check }) {
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
        await check('창이 Blog 폴더에 그대로 있다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        });
        await check('글이 제자리에 남는다', async () => {
          await expect(post).toBeVisible();
        });
      },
    },
  ],
});
