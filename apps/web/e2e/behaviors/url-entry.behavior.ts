import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '주소로 들어온다',
  area: 'Chrome',
  conditions: {
    address: {
      label: '주소',
      values: ['글 주소', '없는 글 주소', '/'],
      base: '글 주소',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'post-address',
      scenario: '주소창에 /posts/react-19-hooks를 입력해 처음 들어온다',
      expected: [
        'React 19 훅 정리 글이 Chrome 창에 열린다',
        'Chrome 창이 하나만 열려 있다',
        '주소가 들어온 글 주소 그대로다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[Chrome:글 화면]]'],
      async run({ page, check }) {
        await page.goto('/posts/react-19-hooks');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await check('React 19 훅 정리 글이 Chrome 창에 열린다', async () => {
          await expect(post).toBeVisible();
          await expect(
            post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }),
          ).toBeVisible();
          await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();
        });
        await check('Chrome 창이 하나만 열려 있다', async () => {
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('주소가 들어온 글 주소 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
    {
      id: 'missing-post',
      change: { address: '없는 글 주소' },
      scenario: '주소창에 없는 글 주소 /posts/none을 입력해 처음 들어온다',
      expected: [
        '404로 응답한다',
        '페이지를 찾을 수 없음 Chrome 창이 열리고 안내 문구가 보인다',
        '주소가 들어온 경로 그대로다',
      ],
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        const response = await page.goto('/posts/none');
        await check('404로 응답한다', async () => {
          await expect.poll(() => response?.status()).toBe(404);
        });
        await check('페이지를 찾을 수 없음 Chrome 창이 열리고 안내 문구가 보인다', async () => {
          await expect(
            page.getByRole('region', { name: '페이지를 찾을 수 없음 - Chrome' }),
          ).toBeVisible();
          await expect(
            page.getByText(
              '다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/none',
            ),
          ).toBeVisible();
        });
        await check('주소가 들어온 경로 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/none$/);
        });
      },
    },
    {
      id: 'mobile',
      change: { screen: '모바일' },
      device: 'Pixel 7',
      scenario: '모바일에서 공유 링크 /posts/react-19-hooks로 처음 들어온다',
      expected: [
        '글이 열린 Chrome 창 하나만 뜬다',
        '창이 화면 전체 너비(412)를 채운다',
        '탭 표시줄이 없다',
        '주소가 들어온 글 주소 그대로다',
      ],
      docs: ['[[창 동작:모바일]]', '[[창 동작:새로고침과 첫 진입]]'],
      async run({ page, check }) {
        await page.goto('/posts/react-19-hooks');
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await check('글이 열린 Chrome 창 하나만 뜬다', async () => {
          await expect(chrome).toBeVisible();
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('창이 화면 전체 너비(412)를 채운다', async () => {
          await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(412);
        });
        await check('탭 표시줄이 없다', async () => {
          await expect(chrome.getByRole('tab')).toHaveCount(0);
        });
        await check('주소가 들어온 글 주소 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
  ],
});
