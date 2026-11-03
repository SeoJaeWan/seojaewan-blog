import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '검색해서 연다',
  area: '검색',
  conditions: {
    entry: {
      label: '입구',
      values: ['작업 표시줄 검색칸', 'Start 검색칸', '모바일 검색 버튼'],
      base: '작업 표시줄 검색칸',
    },
    query: {
      label: '검색어',
      values: ['이름에 포함', '이름 전체와 같음', '한글 초성', '결과 없음'],
      base: '이름에 포함',
    },
    pick: {
      label: '고르는 법',
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
  },
  cases: [
    {
      id: 'taskbar-arrow-enter',
      purpose:
        '작업 표시줄 검색칸에 입력해 글을 찾고 방향키로 골라 Enter로 열면 Chrome 창에 열리고 검색 패널이 닫히며 검색칸이 빈다',
      docs: ['[[검색:결과 화면]]', '[[창 동작:열기 규칙]]'],
      async run({ page }) {
        await page.goto('/');

        const searchBox = page.getByRole('searchbox', { name: '검색', exact: true });
        await searchBox.fill('react');
        const searchPanel = page.getByRole('dialog', { name: '검색' });
        await expect(searchPanel.getByText('최고 일치')).toBeVisible();

        await searchBox.press('ArrowDown');
        await searchBox.press('Enter');

        await expect(searchPanel).toBeHidden();
        await expect(page.getByRole('tab', { name: /React/ })).toBeVisible();
        await expect(searchBox).toHaveValue('');
      },
    },
    {
      id: 'start-restores-minimized-chrome',
      change: { entry: 'Start 검색칸', pick: '최고 일치에서 Enter', chrome: '최소화됨' },
      purpose: 'Start 검색칸으로 글을 찾아 열면 최소화된 Chrome 창이 복원되고 그 창의 새 탭이 된다',
      docs: ['[[Start 메뉴:검색]]', '[[창 동작:열기 규칙]]'],
      async run({ page }) {
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

        await expect(startMenu).toBeHidden();
        const opened = page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' });
        await expect(opened).toBeVisible();
        await expect(opened.getByRole('tab')).toHaveCount(2);
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
      },
    },
  ],
});
