import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: 'Chrome 주소창으로 이동한다',
  area: 'Chrome',
  summary: '글로 이동·글에서 이동·휴지통 글 복원·앞으로·새로고침해도 남음',
  conditions: {
    from: {
      label: '보던 페이지',
      values: ['새 탭 페이지', '글'],
      base: '새 탭 페이지',
    },
    input: {
      label: '주소창에 넣은 것',
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
      label: '창 기록 이동',
      values: ['없음', '뒤로', '뒤로·앞으로'],
      base: '뒤로',
    },
    after: {
      label: '이동한 다음에',
      values: ['없음', '새로고침'],
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
      id: 'post-address-and-back',
      scenario:
        'Chrome 새 탭의 주소창에 글 주소(seojaewan.com/posts/react-19-hooks)를 넣고 Enter를 누른 뒤, 뒤로 버튼을 누른다',
      result: '글이 열리고 뒤로 가면 새 탭',
      expected: [
        '그 글이 열리고 글 탭이 선택된다',
        '주소창이 그 글 주소를 보여준다',
        '브라우저 주소가 그 글 주소를 따라간다',
        '뒤로 가면 새 탭 페이지로 돌아온다',
        '뒤로 가면 브라우저 주소가 /로 돌아온다',
      ],
      docs: ['[[Chrome:주소창]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const chrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(chrome).toBeVisible();

        const address = chrome.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/react-19-hooks');
        await address.press('Enter');

        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await check('그 글이 열리고 글 탭이 선택된다', async () => {
          await expect(post).toBeVisible();
          await expect(post.getByRole('tab', { name: /React 19 훅 정리/ })).toHaveAttribute(
            'aria-selected',
            'true',
          );
        });
        await check('주소창이 그 글 주소를 보여준다', async () => {
          await expect(post.getByRole('combobox', { name: '주소 및 검색창' })).toHaveValue(
            'seojaewan.com/posts/react-19-hooks',
          );
        });
        await check('브라우저 주소가 그 글 주소를 따라간다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });

        await post.getByRole('button', { name: '뒤로' }).click();
        await check('뒤로 가면 새 탭 페이지로 돌아온다', async () => {
          await expect(page.getByRole('region', { name: '새 탭 - Chrome' })).toBeVisible();
        });
        await check('뒤로 가면 브라우저 주소가 /로 돌아온다', async () => {
          await expect(page).toHaveURL(/\/$/);
        });
      },
    },
    {
      id: 'from-shared-post',
      change: { from: '글' },
      scenario:
        '공유 링크(/posts/react-19-hooks)로 들어와 주소창에 다른 글 주소를 넣고 Enter를 누른 뒤, 뒤로 버튼을 누른다',
      result: '글에서 다른 글로 갔다 돌아옴',
      expected: [
        '다른 글이 열리고 브라우저 주소가 그 글을 따라간다',
        '뒤로 가면 처음 글이 열리고 브라우저 주소가 처음 글로 돌아간다',
      ],
      docs: ['[[Chrome:주소창]]', '[[Chrome:구성]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        await page.goto('/posts/react-19-hooks');
        const first = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(first).toBeVisible();

        const address = first.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/nextjs-app-router-cache');
        await address.press('Enter');
        const second = page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' });
        await check('다른 글이 열리고 브라우저 주소가 그 글을 따라간다', async () => {
          await expect(second).toBeVisible();
          await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
        });

        await second.getByRole('button', { name: '뒤로' }).click();
        await check('뒤로 가면 처음 글이 열리고 브라우저 주소가 처음 글로 돌아간다', async () => {
          await expect(
            page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' }),
          ).toBeVisible();
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
    {
      id: 'trashed-post',
      change: { input: '휴지통에 있는 글 주소' },
      scenario:
        '탐색기 Blog 폴더에서 "Notion 블로그 이전기" 글을 Delete로 휴지통에 보낸 뒤, Chrome 새 탭 주소창에 그 글 주소를 넣고 Enter를 눌러 뜬 질문에서 취소하고, 다시 넣어 복원을 누른 뒤 뒤로 버튼을 누른다',
      result: '복원할지 묻고 복원하면 열림',
      expected: [
        '휴지통에 있는 글 주소를 넣으면 복원할지 묻는다',
        '취소하면 질문이 닫히고 새 탭 페이지가 그대로 남는다',
        '복원하면 그 글이 열리고 브라우저 주소가 글을 따라간다',
        '복원하면 글이 탐색기의 원래 폴더로 돌아온다',
      ],
      docs: ['[[Chrome:휴지통에 있는 글]]', '[[휴지통:복원]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        const post = content.getByRole('option', { name: /^Notion 블로그 이전기/ });
        await post.click();
        await page.keyboard.press('Delete');
        await expect(post).not.toBeAttached();

        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const newTab = page.getByRole('region', { name: '새 탭 - Chrome' });
        const address = newTab.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/notion-blog-migration');
        await address.press('Enter');

        const ask = page.getByRole('alertdialog', { name: '휴지통에 있는 글' });
        await check('휴지통에 있는 글 주소를 넣으면 복원할지 묻는다', async () => {
          await expect(ask).toBeVisible();
        });
        await ask.getByRole('button', { name: '취소' }).click();
        await check('취소하면 질문이 닫히고 새 탭 페이지가 그대로 남는다', async () => {
          await expect(ask).not.toBeAttached();
          await expect(page.getByRole('region', { name: '새 탭 - Chrome' })).toBeVisible();
        });

        await address.fill('seojaewan.com/posts/notion-blog-migration');
        await address.press('Enter');
        await page
          .getByRole('alertdialog', { name: '휴지통에 있는 글' })
          .getByRole('button', { name: '복원' })
          .click();
        const restored = page.getByRole('region', { name: 'Notion 블로그 이전기 - Chrome' });
        await check('복원하면 그 글이 열리고 브라우저 주소가 글을 따라간다', async () => {
          await expect(restored).toBeVisible();
          await expect(page).toHaveURL(/\/posts\/notion-blog-migration$/);
        });

        await restored.getByRole('button', { name: '뒤로' }).click();
        await expect(page.getByRole('region', { name: '새 탭 - Chrome' })).toBeVisible();

        await page.getByRole('button', { name: '파일 탐색기' }).click();
        await check('복원하면 글이 탐색기의 원래 폴더로 돌아온다', async () => {
          await expect(post).toBeVisible();
        });
      },
    },
    {
      id: 'back-and-forward',
      change: { history: '뒤로·앞으로' },
      scenario:
        'Chrome 새 탭의 주소창에 글 주소(seojaewan.com/posts/react-19-hooks)를 넣고 Enter를 누른 뒤, 뒤로·앞으로 버튼을 차례로 누른다',
      result: '앞으로 가면 글이 다시 열림',
      expected: ['앞으로 가면 그 글이 다시 열리고 브라우저 주소도 따라간다'],
      docs: ['[[Chrome:주소창]]', '[[Chrome:구성]]', '[[창 동작:브라우저 주소]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const chrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(chrome).toBeVisible();

        const address = chrome.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/react-19-hooks');
        await address.press('Enter');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post).toBeVisible();

        await post.getByRole('button', { name: '뒤로' }).click();
        const back = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(back).toBeVisible();

        await back.getByRole('button', { name: '앞으로' }).click();
        await check('앞으로 가면 그 글이 다시 열리고 브라우저 주소도 따라간다', async () => {
          await expect(
            page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' }),
          ).toBeVisible();
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
    {
      id: 'reload-after-move',
      change: { after: '새로고침' },
      combine: {
        change: { history: '없음' },
        reason:
          '기준인 뒤로까지 하면 새 탭 페이지(/)로 돌아와 새로고침 뒤 바탕화면만 남으므로, 글에 머문 채 새로고침해야 글 창이 남는지 드러난다',
      },
      scenario:
        'Chrome 새 탭의 주소창에 글 주소(seojaewan.com/posts/react-19-hooks)를 넣고 Enter를 누른 뒤 브라우저를 새로고침한다',
      result: '새로고침해도 글 창 하나만 남음',
      expected: [
        '새로고침하면 그 글 창 하나만 열린다',
        '새로고침해도 브라우저 주소는 그 글 그대로다',
      ],
      docs: ['[[Chrome:주소창]]', '[[창 동작:새로고침과 첫 진입]]'],
      async run({ page, check }) {
        await page.goto('/');
        await page.getByRole('button', { name: 'Google Chrome' }).click();
        const chrome = page.getByRole('region', { name: '새 탭 - Chrome' });
        await expect(chrome).toBeVisible();

        const address = chrome.getByRole('combobox', { name: '주소 및 검색창' });
        await address.fill('seojaewan.com/posts/react-19-hooks');
        await address.press('Enter');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post).toBeVisible();

        await page.reload();
        await check('새로고침하면 그 글 창 하나만 열린다', async () => {
          await expect(post).toBeVisible();
          await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
        });
        await check('새로고침해도 브라우저 주소는 그 글 그대로다', async () => {
          await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
        });
      },
    },
  ],
});
