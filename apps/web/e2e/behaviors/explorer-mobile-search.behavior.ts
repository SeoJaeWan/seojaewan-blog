import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '모바일 탐색기에서 검색 줄로 찾는다',
  area: '탐색기',
  summary: '초성으로 찾고 Esc로 닫음',
  conditions: {
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: '모바일',
    },
    query: {
      label: '검색어',
      values: ['한글 초성', '이름에 포함', '비어 있음'],
      base: '한글 초성',
    },
    close: {
      label: '검색 줄을 닫는 법',
      values: ['Esc', '← 버튼', '다른 위치로 감', '새 폴더 만들기'],
      base: 'Esc',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '터치'],
      base: '터치',
    },
  },
  requires: [
    { when: { screen: 'PC' }, then: { input: '마우스' } },
    { when: { screen: '노트북' }, then: { input: '마우스' } },
  ],
  noCase: {
    screen: {
      PC: {
        reason: 'PC는 주소 줄에 검색 상자가 늘 있어 검색 줄을 따로 열지 않는다.',
        docs: ['[[파일 탐색기:구성]]', '[[파일 탐색기:폴더 안 검색]]'],
      },
      노트북: {
        reason: '노트북도 PC와 같은 주소 줄에 검색 상자가 늘 있어 검색 줄을 따로 열지 않는다.',
        docs: ['[[파일 탐색기:구성]]', '[[파일 탐색기:폴더 안 검색]]'],
      },
    },
  },
  cases: [
    {
      id: 'search-row-and-esc',
      result: '초성으로 찾고 Esc로 닫힘',
      device: 'Pixel 7',
      scenario:
        '모바일에서 Blog 폴더를 탭해 연 탐색기의 검색 버튼을 탭해 검색 줄을 열고, "ㅎㄱ"을 입력한 뒤 Esc를 누른다',
      expected: [
        '검색 줄이 열리면 검색 상자에 포커스가 간다',
        '초성 "ㅎㄱ"으로 "2026 상반기 회고"가 찾아진다',
        'Esc를 누르면 검색 줄이 닫힌다',
        '뒤로 버튼이 있는 원래 주소 줄로 돌아온다',
        '검색어가 지워져 원래 폴더 내용이 보인다',
      ],
      docs: ['[[파일 탐색기:폴더 안 검색]]', '[[파일 탐색기:모바일]]'],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await touch.tap(explorer.getByRole('button', { name: '검색', exact: true }));
        const searchBox = explorer.getByRole('searchbox', { name: '검색' });
        await check('검색 줄이 열리면 검색 상자에 포커스가 간다', async () => {
          await expect(searchBox).toBeFocused();
        });
        await searchBox.fill('ㅎㄱ');
        await check('초성 "ㅎㄱ"으로 "2026 상반기 회고"가 찾아진다', async () => {
          await expect(content.getByRole('option', { name: /^2026 상반기 회고/ })).toBeVisible();
        });

        await searchBox.press('Escape');
        await check('Esc를 누르면 검색 줄이 닫힌다', async () => {
          await expect(searchBox).not.toBeAttached();
        });
        await check('뒤로 버튼이 있는 원래 주소 줄로 돌아온다', async () => {
          await expect(explorer.getByRole('button', { name: '뒤로' })).toBeVisible();
        });
        await check('검색어가 지워져 원래 폴더 내용이 보인다', async () => {
          await expect(
            content.getByRole('option', { name: '2026 상반기 회고', exact: true }),
          ).toBeVisible();
        });
      },
    },
  ],
});
