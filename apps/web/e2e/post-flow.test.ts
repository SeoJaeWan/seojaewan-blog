import { expect, test } from '@playwright/test';

// @codocs [[Chrome:주소창]]
// @codocs [[Chrome:구성]]
// @codocs [[창 동작:브라우저 주소]]
// @codocs [[창 동작:새로고침과 첫 진입]]
test('공유 링크로 들어와 주소창으로 다른 글을 열고 뒤로·앞으로 가면 브라우저 주소가 따라가고, 새로고침하면 그 글 창 하나로 시작한다', async ({
  page,
}) => {
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
});

// @codocs [[창 동작:열기 규칙]]
// @codocs [[파일 탐색기:조작]]
test('바탕화면 Blog 폴더에서 폴더를 지나 글을 열면 Chrome 창에 열려 주소가 바뀌고, 같은 글을 다시 열면 같은 창의 새 탭이 된다', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  const content = explorer.getByRole('listbox', { name: '폴더 내용' });
  await content.getByRole('option', { name: 'React', exact: true }).dblclick();
  await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();

  const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(chrome).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
  await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);

  // 탐색기를 앞으로 가져와 같은 글을 다시 연다.
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await content.getByRole('option', { name: /^React 19 훅 정리/ }).dblclick();
  await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
  await expect(chrome.getByRole('tab', { name: /React 19 훅 정리/ })).toHaveCount(2);
});

// @codocs [[Chrome:휴지통에 있는 글]]
// @codocs [[휴지통:복원]]
test('휴지통에 보낸 글을 주소로 열면 복원할지 묻고, 복원하면 글이 열리고 원래 폴더로 돌아온다', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
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
  await expect(page.getByRole('region', { name: 'Notion 블로그 이전기 - Chrome' })).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/notion-blog-migration$/);

  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await expect(post).toBeVisible();
});
