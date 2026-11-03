import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: 'Chrome 주소창으로 이동한다',
  area: 'Chrome',
  conditions: {
    from: {
      label: '보던 페이지',
      values: ['새 탭 페이지', '글'],
      base: '새 탭 페이지',
    },
    input: {
      label: '입력',
      values: [
        '블로그 글 주소',
        '추천 고르기',
        '외부 주소',
        '그 밖의 글자(검색)',
        '없는 글 주소',
        '휴지통에 있는 글 주소',
      ],
      base: '블로그 글 주소',
    },
    history: {
      label: '기록 이동',
      values: ['없음', '뒤로', '뒤로·앞으로'],
      base: '뒤로',
    },
    after: {
      label: '그 뒤',
      values: ['없음', '새로고침'],
      base: '없음',
    },
  },
  cases: [
    {
      id: 'post-address-and-back',
      purpose:
        'Chrome 주소창에 글 주소를 넣으면 그 글 탭이 되고 브라우저 주소가 글을 따라가며, 뒤로 가면 새 탭과 `/`로 돌아간다',
      docs: ['[[Chrome:주소창]]', '[[창 동작:브라우저 주소]]'],
      async run({ page }) {
        await page.goto('/');
        await page.getByRole('button', { name: 'Chrome' }).click();
        const chrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(chrome).toBeVisible();

        const address = chrome.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/react-19-hooks');
        await address.press('Enter');

        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post).toBeVisible();
        await expect(post.getByRole('tab', { name: /React 19 훅 정리/ })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await expect(post.getByRole('combobox', { name: '주소 및 검색창' })).toHaveValue(
          'seojaewan.com/posts/react-19-hooks',
        );
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);

        await post.getByRole('button', { name: '뒤로' }).click();
        await expect(page.getByRole('region', { name: '새 탭 - Chrome' })).toBeVisible();
        await expect(page).toHaveURL(/\/$/);
      },
    },
    {
      id: 'shared-link-history-reload',
      change: { from: '글', history: '뒤로·앞으로', after: '새로고침' },
      purpose:
        '공유 링크로 들어와 주소창으로 다른 글을 열고 뒤로·앞으로 가면 브라우저 주소가 따라가고, 새로고침하면 그 글 창 하나로 시작한다',
      docs: [
        '[[Chrome:주소창]]',
        '[[Chrome:구성]]',
        '[[창 동작:브라우저 주소]]',
        '[[창 동작:새로고침과 첫 진입]]',
      ],
      async run({ page }) {
        await page.goto('/posts/react-19-hooks');
        const first = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(first).toBeVisible();

        const address = first.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/nextjs-app-router-cache');
        await address.press('Enter');
        const second = page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' });
        await expect(second).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);

        await second.getByRole('button', { name: '뒤로' }).click();
        const back = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(back).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);

        await back.getByRole('button', { name: '앞으로' }).click();
        await expect(
          page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);

        await page.reload();
        await expect(
          page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
        ).toBeVisible();
        await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
      },
    },
    {
      id: 'trashed-post',
      change: { input: '휴지통에 있는 글 주소', history: '없음' },
      purpose:
        '휴지통에 보낸 글을 주소로 열면 복원할지 묻고, 취소하면 보던 페이지를 두고, 복원하면 글이 열리고 원래 폴더로 돌아온다',
      docs: ['[[Chrome:휴지통에 있는 글]]', '[[휴지통:복원]]'],
      async run({ page }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        const post = content.getByRole('option', { name: /^Notion 블로그 이전기/ });
        await post.click();
        await page.keyboard.press('Delete');
        await expect(post).not.toBeAttached();

        await page.getByRole('button', { name: 'Chrome' }).click();
        const newTab = page.getByRole('region', { name: '새 탭 - Chrome' });
        const address = newTab.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/notion-blog-migration');
        await address.press('Enter');

        const ask = page.getByRole('alertdialog', { name: '휴지통에 있는 글' });
        await expect(ask).toBeVisible();
        await ask.getByRole('button', { name: '취소' }).click();
        await expect(ask).not.toBeAttached();
        await expect(page.getByRole('region', { name: '새 탭 - Chrome' })).toBeVisible();

        await address.fill('seojaewan.com/posts/notion-blog-migration');
        await address.press('Enter');
        await page
          .getByRole('alertdialog', { name: '휴지통에 있는 글' })
          .getByRole('button', { name: '복원' })
          .click();
        await expect(
          page.getByRole('region', { name: 'Notion 블로그 이전기 - Chrome' }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/posts\/notion-blog-migration$/);

        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await expect(post).toBeVisible();
      },
    },
  ],
});
