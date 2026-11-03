import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기에서 폴더를 옮겨 다닌다',
  area: '탐색기',
  conditions: {
    move: {
      label: '폴더를 옮기는 법',
      values: [
        '폴더 더블클릭',
        '탐색 창',
        '위치 칸',
        '위로',
        '뒤로·앞으로 버튼',
        'Backspace·Alt + ←/→',
        '폴더 한 번 터치',
      ],
      base: '폴더 더블클릭',
    },
    tabs: {
      label: '탭 사용',
      values: ['탭 하나', '새 탭 열고 닫기', '탭 순서 바꾸기'],
      base: '탭 하나',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'double-click-folder',
      scenario: 'Blog 폴더 탐색기에서 React 폴더를 더블클릭한다',
      expected: [
        '같은 탐색기 창이 React 폴더로 바뀐다',
        'React 안의 글 "React 19 훅 정리"가 보인다',
      ],
      docs: ['[[파일 탐색기:조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await content.getByText('React', { exact: true }).dblclick();
        await check('같은 탐색기 창이 React 폴더로 바뀐다', async () => {
          await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        });
        await check('React 안의 글 "React 19 훅 정리"가 보인다', async () => {
          await expect(content.getByText('React 19 훅 정리')).toBeVisible();
        });
      },
    },
    {
      id: 'back-forward-buttons',
      change: { move: '뒤로·앞으로 버튼' },
      scenario:
        'Blog 폴더 탐색기에서 React 폴더로 들어간 뒤, 주소 줄의 뒤로 버튼과 앞으로 버튼을 차례로 누른다',
      expected: [
        '뒤로 버튼을 누르면 Blog 폴더로 돌아온다',
        '앞으로 버튼을 누르면 React 폴더로 다시 간다',
      ],
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:탭]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await content.getByText('React', { exact: true }).dblclick();
        await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();

        await explorer.getByRole('button', { name: '뒤로' }).click();
        await check('뒤로 버튼을 누르면 Blog 폴더로 돌아온다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        });
        await explorer.getByRole('button', { name: '앞으로' }).click();
        await check('앞으로 버튼을 누르면 React 폴더로 다시 간다', async () => {
          await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        });
      },
    },
    {
      id: 'navigation-pane',
      change: { move: '탐색 창' },
      scenario:
        'Blog 폴더 탐색기의 왼쪽 탐색 창에서 Next.js 폴더를 누르고, 이어서 Blog 폴더를 누른다',
      expected: [
        '탐색 창의 Next.js를 누르면 창이 Next.js 폴더로 바뀐다',
        '탐색 창의 Blog를 누르면 창이 Blog 폴더로 돌아온다',
      ],
      docs: ['[[파일 탐색기:탐색 창]]', '[[파일 탐색기:조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const tree = explorer.getByRole('tree', { name: '탐색 창' });

        await tree.getByText('Next.js').click();
        await check('탐색 창의 Next.js를 누르면 창이 Next.js 폴더로 바뀐다', async () => {
          await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
        });
        await tree.getByText('Blog').click();
        await check('탐색 창의 Blog를 누르면 창이 Blog 폴더로 돌아온다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        });
      },
    },
    {
      id: 'location-bar',
      change: { move: '위치 칸' },
      scenario: 'Blog 폴더 탐색기의 주소 줄에서 "바탕 화면" 버튼을 누른다',
      expected: ['창이 바탕 화면으로 바뀐다', '바탕 화면에서는 위로 버튼이 비활성이다'],
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:탭]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });

        await explorer.getByRole('button', { name: '바탕 화면' }).click();
        await check('창이 바탕 화면으로 바뀐다', async () => {
          await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
        });
        await check('바탕 화면에서는 위로 버튼이 비활성이다', async () => {
          await expect(explorer.getByRole('button', { name: '위로' })).toBeDisabled();
        });
      },
    },
    {
      id: 'open-and-close-tabs',
      change: { tabs: '새 탭 열고 닫기' },
      scenario:
        'Blog 폴더 탐색기에서 새 탭 버튼으로 탭을 하나 더 열고, 새 탭의 닫기 버튼과 남은 탭의 닫기 버튼을 차례로 누른다',
      expected: [
        '새 탭은 바탕 화면으로 열려 탭이 2개가 된다',
        '새 탭을 닫으면 Blog 폴더가 다시 보인다',
        '마지막 탭을 닫으면 탐색기 창이 닫힌다',
      ],
      docs: ['[[파일 탐색기:탭]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });

        await explorer.getByRole('button', { name: '새 탭' }).click();
        await check('새 탭은 바탕 화면으로 열려 탭이 2개가 된다', async () => {
          await expect(explorer.getByRole('tab')).toHaveCount(2);
          await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
        });

        await explorer
          .getByRole('tab', { name: /바탕 화면/ })
          .locator('..')
          .getByLabel('탭 닫기')
          .click();
        await check('새 탭을 닫으면 Blog 폴더가 다시 보인다', async () => {
          await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        });
        await explorer.getByLabel('탭 닫기').click();
        await check('마지막 탭을 닫으면 탐색기 창이 닫힌다', async () => {
          await expect(explorer).not.toBeAttached();
        });
      },
    },
    {
      id: 'touch-tap-folder',
      change: { move: '폴더 한 번 터치', input: '터치', screen: '모바일' },
      device: 'Pixel 7',
      scenario: '모바일에서 Blog 폴더를 탭해 연 탐색기의 React 폴더를 한 번 탭한다',
      expected: [
        '같은 창이 React 폴더로 바뀐다',
        'React 안의 글 "React 19 훅 정리"가 보인다',
        '탐색기 창이 새로 생기지 않는다',
      ],
      docs: ['[[반응형:입력 차이]]', '[[파일 탐색기:모바일]]'],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await touch.tap(content.getByRole('option', { name: 'React', exact: true }));
        await check('같은 창이 React 폴더로 바뀐다', async () => {
          await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        });
        await check('React 안의 글 "React 19 훅 정리"가 보인다', async () => {
          await expect(content.getByRole('option', { name: /^React 19 훅 정리/ })).toBeVisible();
        });
        await check('탐색기 창이 새로 생기지 않는다', async () => {
          await expect(page.getByRole('region', { name: /- 파일 탐색기$/ })).toHaveCount(1);
        });
      },
    },
  ],
});
