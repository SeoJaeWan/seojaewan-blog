import { expect, test } from '@playwright/test';

test('라이선스 화면에 제3자 고지가 보인다', async ({ page }) => {
  const response = await page.goto('/licenses');

  expect(response?.ok()).toBe(true);
  await expect(page.getByText('SIL OPEN FONT LICENSE Version 1.1')).toBeVisible();
  await expect(page.getByText('Fluent UI System Icons').first()).toBeVisible();
});
