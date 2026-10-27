import { expect, test } from '@playwright/test';

// @codocs [[Chrome:주소창]]
// @codocs [[창 동작:브라우저 주소]]
test('Chrome 주소창에 글 주소를 넣으면 그 글 탭이 되고 브라우저 주소가 글을 따라간다', async ({
  page,
}) => {
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
});
