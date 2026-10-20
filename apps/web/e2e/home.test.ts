import { expect, test } from '@playwright/test';

test('홈 화면이 열린다', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('main')).toBeAttached();
});
