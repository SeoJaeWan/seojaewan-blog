import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기에서 글을 연다',
  area: '탐색기',
  summary: 'Chrome에 열림·다시 열면 탭 추가·모바일 전체화면',
  conditions: {
    chrome: {
      label: '열린 Chrome 창',
      values: ['없음', '있음', '최소화됨'],
      base: '없음',
    },
    again: {
      label: '같은 글을 연 적',
      values: ['처음 엶', '다시 엶'],
      base: '처음 엶',
    },
    how: {
      label: '여는 법',
      values: ['열기', '새 창에서 열기'],
      base: '열기',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'open-post',
      result: 'Chrome 창 하나에 글이 열림',
      scenario:
        'Blog 폴더 탐색기에서 React 폴더를 더블클릭해 들어간 뒤 "React 19 훅 정리" 글을 더블클릭한다',
      expected: [
        'Chrome 창에 글이 열린다',
        '주소가 /posts/react-19-hooks로 바뀐다',
        'Chrome 창은 하나만 열린다',
      ],
      docs: ['[[창 동작:열기 규칙]]', '[[파일 탐색기:조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).dblclick();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();

        await check('Chrome 창에 글이 열린다', async () => {
          await expect(
            page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' }),
          ).toBeVisible();
        });
        await check('주소가 /posts/react-19-hooks로 바뀐다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
        await check('Chrome 창은 하나만 열린다', async () => {
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
      },
    },
    {
      id: 'reopen-post',
      result: 'Chrome 하나, 같은 글 탭 2개',
      change: { again: '다시 엶' },
      combine: {
        change: { chrome: '있음' },
        reason: '같은 글을 다시 열 때 탭이 늘어나는지는 처음 연 Chrome 창이 남아 있어야 볼 수 있다',
      },
      scenario:
        'Blog 폴더 탐색기에서 React 19 훅 정리 글을 열어 Chrome이 뜬 뒤, 작업 표시줄의 파일 탐색기 버튼으로 탐색기를 앞으로 가져와 같은 글을 다시 더블클릭한다',
      expected: ['Chrome 창은 여전히 하나다', '같은 글의 탭이 2개가 된다'],
      docs: ['[[창 동작:열기 규칙]]', '[[파일 탐색기:조작]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).dblclick();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();

        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();
        await check('Chrome 창은 여전히 하나다', async () => {
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('같은 글의 탭이 2개가 된다', async () => {
          await expect(chrome.getByRole('tab', { name: /React 19 훅 정리/ })).toHaveCount(2);
        });
      },
    },
    {
      id: 'mobile-full-screen',
      result: '탐색기·Chrome 모두 전체 너비',
      change: { screen: '모바일' },
      device: 'Pixel 7',
      scenario:
        '모바일에서 Blog 폴더를 탭해 연 탐색기에서 React 폴더와 "React 19 훅 정리" 글을 차례로 탭해 열고, 작업 표시줄의 파일 탐색기 버튼으로 탐색기에 돌아간 뒤, 검색 버튼으로 연 검색 패널에 "app router"를 입력해 Enter를 누른다',
      expected: [
        '탐색기가 화면 너비(412px) 전체로 열린다',
        'Chrome이 화면 너비(412px) 전체화면으로 열린다',
        '주소가 /posts/react-19-hooks로 바뀐다',
        '탐색기 버튼을 누르면 탐색기가 앞으로 오고 Chrome은 뒤로 간다',
        '탐색기가 앞으로 오면 주소가 /로 돌아온다',
        'Enter를 누르면 검색 패널이 닫힌다',
        '검색한 "Next.js App Router 캐시" 글이 Chrome으로 열린다',
        '주소가 /posts/nextjs-app-router-cache로 바뀐다',
      ],
      docs: ['[[창 동작:모바일]]', '[[작업 표시줄:모바일]]', '[[검색:모바일]]'],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        await expect(explorer).toBeVisible();
        await check('탐색기가 화면 너비(412px) 전체로 열린다', async () => {
          await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(412);
        });

        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await touch.tap(content.getByRole('option', { name: 'React', exact: true }));
        await touch.tap(content.getByRole('option', { name: /^React 19 훅 정리/ }));
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await check('Chrome이 화면 너비(412px) 전체화면으로 열린다', async () => {
          await expect(chrome).toBeVisible();
          await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(412);
        });
        await check('주소가 /posts/react-19-hooks로 바뀐다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });

        // 창은 하나만 보인다. 탐색기 버튼을 누르면 탐색기가 앞으로 온다.
        await touch.tap(page.getByRole('button', { name: '파일 탐색기' }));
        await check('탐색기 버튼을 누르면 탐색기가 앞으로 오고 Chrome은 뒤로 간다', async () => {
          await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
          await expect(chrome).toHaveAttribute('data-window-state', 'inactive');
        });
        await check('탐색기가 앞으로 오면 주소가 /로 돌아온다', async () => {
          await expect(page).toHaveURL(/\/$/);
        });

        // 검색 패널 안의 입력칸으로 글을 찾아 연다.
        await touch.tap(page.getByRole('button', { name: '검색', expanded: false }));
        const panel = page.getByRole('dialog', { name: '검색' });
        await panel.getByRole('searchbox', { name: '검색' }).fill('app router');
        await panel.getByRole('searchbox', { name: '검색' }).press('Enter');
        await check('Enter를 누르면 검색 패널이 닫힌다', async () => {
          await expect(panel).toBeHidden();
        });
        await check('검색한 "Next.js App Router 캐시" 글이 Chrome으로 열린다', async () => {
          await expect(
            page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
          ).toBeVisible();
        });
        await check('주소가 /posts/nextjs-app-router-cache로 바뀐다', async () => {
          await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
        });
      },
    },
  ],
});
