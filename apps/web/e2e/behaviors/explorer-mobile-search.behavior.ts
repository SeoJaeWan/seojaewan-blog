import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '모바일 탐색기에서 검색 줄로 찾는다',
  area: '탐색기',
  conditions: {
    query: {
      label: '검색어',
      values: ['한글 초성', '이름에 포함', '비어 있음'],
      base: '한글 초성',
    },
    close: {
      label: '끝내는 법',
      values: ['Esc', '← 버튼', '다른 위치로 감', '새 폴더 만들기'],
      base: 'Esc',
    },
    input: {
      label: '입력',
      values: ['마우스', '터치'],
      base: '마우스',
    },
  },
  cases: [
    {
      id: 'search-row-and-esc',
      purpose: '모바일 탐색기는 검색 버튼으로 검색 줄을 열어 찾고, Esc로 원래 주소 줄로 돌아간다',
      docs: ['[[파일 탐색기:폴더 안 검색]]', '[[파일 탐색기:모바일]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page
          .getByRole('listbox', { name: '바탕화면 아이콘' })
          .getByRole('option', { name: 'Blog' })
          .click();
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await explorer.getByRole('button', { name: '검색', exact: true }).click();
        const searchBox = explorer.getByRole('searchbox', { name: '검색' });
        await expect(searchBox).toBeFocused();
        await searchBox.fill('ㅎㄱ');
        await expect(content.getByRole('option', { name: /^2026 상반기 회고/ })).toBeVisible();

        await searchBox.press('Escape');
        await expect(searchBox).not.toBeAttached();
        await expect(explorer.getByRole('button', { name: '뒤로' })).toBeVisible();
        await expect(
          content.getByRole('option', { name: '2026 상반기 회고', exact: true }),
        ).toBeVisible();
      },
    },
  ],
});
