import { expect, test } from '@playwright/test';

test('홈 화면이 콘솔 오류(수화 불일치 등) 없이 열린다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('main', { name: '바탕화면' })).toBeVisible();
  await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('바탕화면 아래에 작업 표시줄(시작 버튼, 시계)이 보인다', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 20, 15, 24));
  await page.goto('/');

  await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
  await expect(page.getByText('오후 3:24')).toBeVisible();
  await expect(page.getByText('2026-10-20')).toBeVisible();
});
