import { expect, test } from '@playwright/test';

// @codocs [[작업 공간:다시 시작]]
test('Start 전원 메뉴에서 다시 시작하면 재부팅 화면이 보였다 사라지고 열린 창이 모두 닫힌다', async ({
  page,
}) => {
  await page.goto('/');
  const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await expect(explorer).toBeVisible();

  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('dialog', { name: '시작' }).getByRole('button', { name: '전원' }).click();
  await page.getByRole('menuitem', { name: '다시 시작' }).click();

  const bootScreen = page.getByRole('progressbar', { name: '다시 시작하는 중' });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).not.toBeAttached();
  await expect(explorer).not.toBeAttached();
  await expect(page.getByRole('dialog', { name: '시작' })).not.toBeAttached();
});
