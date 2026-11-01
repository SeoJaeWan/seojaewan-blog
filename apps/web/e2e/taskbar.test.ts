import { expect, test } from '@playwright/test';

// @codocs [[작업 표시줄:앱 버튼]]
// @codocs [[작업 표시줄:창 미리보기]]
test('같은 앱의 창이 둘이면 앱 버튼이 미리보기 목록을 띄우고, 고른 창이 앞으로 온다', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  await expect(desktopWindow).toBeVisible();
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  await expect(blog).toBeVisible();
  await expect(blog).toHaveAttribute('data-window-state', 'active');

  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await page.getByRole('button', { name: '바탕 화면 - 파일 탐색기' }).click();
  await expect(desktopWindow).toHaveAttribute('data-window-state', 'active');
  await expect(blog).toHaveAttribute('data-window-state', 'inactive');
});
