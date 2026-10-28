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

// @codocs [[창 동작:새로고침과 첫 진입]]
// @codocs [[Chrome:글 화면]]
test('글 주소로 처음 들어오면 그 글이 열린 Chrome 창 하나로 시작한다', async ({ page }) => {
  await page.goto('/posts/react-19-hooks');
  const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(post).toBeVisible();
  await expect(post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' })).toBeVisible();
  await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();
  await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
  await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
});

// @codocs [[창 동작:새로고침과 첫 진입]]
test('없는 글 주소는 404로 답하고 찾을 수 없음 Chrome 창 하나로 시작한다', async ({ page }) => {
  const response = await page.goto('/posts/none');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('region', { name: '페이지를 찾을 수 없음 - Chrome' })).toBeVisible();
  await expect(
    page.getByText('다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/none'),
  ).toBeVisible();
});
