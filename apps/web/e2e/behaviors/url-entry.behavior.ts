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
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'post-address',
      purpose: '글 주소로 처음 들어오면 그 글이 열린 Chrome 창 하나로 시작한다',
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[Chrome:글 화면]]'],
      async run({ page }) {
        await page.goto('/posts/react-19-hooks');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post).toBeVisible();
        await expect(
          post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }),
        ).toBeVisible();
        await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
      },
    },
    {
      id: 'missing-post',
      change: { address: '없는 글 주소' },
      purpose:
        '없는 글 주소는 404로 답하고 찾을 수 없음 Chrome 창 하나로 시작하며 주소를 그대로 둔다',
      docs: ['[[창 동작:새로고침과 첫 진입]]', '[[창 동작:브라우저 주소]]'],
      async run({ page }) {
        const response = await page.goto('/posts/none');
        expect(response?.status()).toBe(404);
        await expect(
          page.getByRole('region', { name: '페이지를 찾을 수 없음 - Chrome' }),
        ).toBeVisible();
        await expect(
          page.getByText(
            '다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/none',
          ),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/none$/);
      },
    },
    {
      id: 'mobile',
      change: { screen: '모바일' },
      purpose: '모바일에서 공유 링크로 들어오면 그 글이 열린 전체화면 Chrome 창 하나로 시작한다',
      docs: ['[[창 동작:모바일]]', '[[창 동작:새로고침과 첫 진입]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/posts/react-19-hooks');
        const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(chrome).toBeVisible();
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(390);
        await expect(chrome.getByRole('tab')).toHaveCount(0);
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
      },
    },
  ],
});
