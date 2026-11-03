import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기에서 폴더를 옮겨 다닌다',
  area: '탐색기',
  conditions: {
    move: {
      label: '옮기는 법',
      values: [
        '폴더 더블클릭',
        '탐색 창',
        '위치 칸',
        '위로',
        '뒤로·앞으로 버튼',
        'Backspace·Alt + ←/→',
        '폴더 탭',
      ],
      base: '폴더 더블클릭',
    },
    tabs: {
      label: '탭',
      values: ['새 탭 열고 닫기', '탭 하나', '탭 순서 바꾸기'],
      base: '새 탭 열고 닫기',
    },
    input: {
      label: '입력',
      values: ['마우스', '키보드', '터치'],
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
      id: 'folders-history-tabs',
      purpose: '탐색기에서 폴더를 옮겨 다니고, 뒤로·앞으로 가고, 탭을 열고 닫는다',
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:탭]]', '[[창 동작:열기 규칙]]'],
      async run({ page }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await content.getByText('React', { exact: true }).dblclick();
        await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        await expect(content.getByText('React 19 훅 정리')).toBeVisible();

        await explorer.getByRole('button', { name: '뒤로' }).click();
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await explorer.getByRole('button', { name: '앞으로' }).click();
        await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();

        await explorer.getByRole('tree', { name: '탐색 창' }).getByText('Next.js').click();
        await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
        await explorer.getByRole('button', { name: '바탕 화면' }).click();
        await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
        await expect(explorer.getByRole('button', { name: '위로' })).toBeDisabled();

        await explorer.getByRole('tree', { name: '탐색 창' }).getByText('Blog').click();
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await explorer.getByRole('button', { name: '새 탭' }).click();
        await expect(explorer.getByRole('tab')).toHaveCount(2);
        await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();

        await explorer
          .getByRole('tab', { name: /바탕 화면/ })
          .locator('..')
          .getByLabel('탭 닫기')
          .click();
        await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
        await explorer.getByLabel('탭 닫기').click();
        await expect(explorer).not.toBeAttached();
      },
    },
    {
      id: 'touch-tap-folder',
      change: { move: '폴더 탭', tabs: '탭 하나', input: '터치', screen: '모바일' },
      device: 'Pixel 7',
      purpose: '모바일 탐색기에서 폴더를 한 번 탭하면 같은 창에서 그 폴더로 들어간다',
      docs: ['[[반응형:입력 차이]]', '[[파일 탐색기:모바일]]'],
      async run({ page, touch }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await touch.tap(content.getByRole('option', { name: 'React', exact: true }));
        await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
        await expect(content.getByRole('option', { name: /^React 19 훅 정리/ })).toBeVisible();
        await expect(page.getByRole('region', { name: /- 파일 탐색기$/ })).toHaveCount(1);
      },
    },
  ],
});
