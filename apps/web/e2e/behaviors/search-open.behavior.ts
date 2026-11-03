import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '검색해서 연다',
  area: '검색',
  conditions: {
    entry: {
      label: '검색을 여는 곳',
      values: ['작업 표시줄 검색칸', 'Start 검색칸', '모바일 검색 버튼'],
      base: '작업 표시줄 검색칸',
    },
    query: {
      label: '검색어 종류',
      values: ['이름에 포함', '이름 전체와 같음', '한글 초성', '결과 없음'],
      base: '이름에 포함',
    },
    pick: {
      label: '결과를 고르는 법',
      values: ['↓로 고르고 Enter', '최고 일치에서 Enter', '목록 클릭', '카드의 열기'],
      base: '↓로 고르고 Enter',
    },
    item: {
      label: '여는 항목',
      values: ['글', '폴더', '외부 링크'],
      base: '글',
    },
    chrome: {
      label: '열린 Chrome 창',
      values: ['없음', '있음', '최소화됨'],
      base: '없음',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'taskbar-arrow-enter',
      scenario: '작업 표시줄 검색칸에 react를 입력하고, ↓로 결과를 고른 뒤 Enter를 누른다',
      expected: [
        'React가 들어간 글이 Chrome 탭으로 열린다',
        '검색 패널이 닫힌다',
        '작업 표시줄 검색칸이 비워진다',
      ],
      docs: ['[[검색:결과 화면]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');

        const searchBox = page.getByRole('searchbox', { name: '검색', exact: true });
        await searchBox.fill('react');
        const searchPanel = page.getByRole('dialog', { name: '검색' });
        await expect(searchPanel.getByText('최고 일치')).toBeVisible();

        await searchBox.press('ArrowDown');
        await searchBox.press('Enter');

        await check('검색 패널이 닫힌다', async () => {
          await expect(searchPanel).toBeHidden();
        });
        await check('React가 들어간 글이 Chrome 탭으로 열린다', async () => {
          await expect(page.getByRole('tab', { name: /React/ })).toBeVisible();
        });
        await check('작업 표시줄 검색칸이 비워진다', async () => {
          await expect(searchBox).toHaveValue('');
        });
      },
    },
    {
      id: 'start-restores-minimized-chrome',
      change: { entry: 'Start 검색칸', pick: '최고 일치에서 Enter', chrome: '최소화됨' },
      scenario:
        'React 글이 열린 Chrome 창을 최소화하고, Start 검색칸에 app router를 입력해 최고 일치에서 Enter를 누른다',
      expected: [
        'Start 메뉴가 닫힌다',
        '최소화됐던 Chrome 창이 복원되고 그 창의 새 탭으로 글이 열린다',
        'Chrome 창은 새로 생기지 않고 하나만 남는다',
        '주소가 열린 글의 주소로 바뀐다',
      ],
      docs: ['[[Start 메뉴:검색]]', '[[창 동작:열기 규칙]]'],
      async run({ page, check }) {
        await page.goto('/posts/react-19-hooks');
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await chrome.getByRole('button', { name: '최소화' }).click();
        await expect(chrome).toBeHidden();

        await page.getByRole('button', { name: '시작' }).click();
        const startMenu = page.getByRole('dialog', { name: '시작' });
        const searchBox = startMenu.getByRole('searchbox', { name: '시작 메뉴 검색' });
        await searchBox.fill('app router');
        await expect(startMenu.getByText('최고 일치')).toBeVisible();
        await searchBox.press('Enter');

        await check('Start 메뉴가 닫힌다', async () => {
          await expect(startMenu).toBeHidden();
        });
        const opened = page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' });
        await check('최소화됐던 Chrome 창이 복원되고 그 창의 새 탭으로 글이 열린다', async () => {
          await expect(opened).toBeVisible();
          await expect(opened.getByRole('tab')).toHaveCount(2);
        });
        await check('Chrome 창은 새로 생기지 않고 하나만 남는다', async () => {
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('주소가 열린 글의 주소로 바뀐다', async () => {
          await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
        });
      },
    },
  ],
});
