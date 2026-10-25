import { expect, test } from '@playwright/test';

test('작업 표시줄에서 탐색기를 열고, 최소화했다가 복원한 뒤 닫는다', async ({ page }) => {
  await page.goto('/');
  const taskbarButton = page.getByRole('button', { name: '파일 탐색기' });
  const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });

  await taskbarButton.click();
  await expect(explorer).toBeVisible();

  await explorer.getByRole('button', { name: '최소화' }).click();
  await expect(explorer).toBeHidden();

  await taskbarButton.click();
  await expect(explorer).toBeVisible();

  await explorer.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(explorer).not.toBeAttached();
});

test('바탕화면의 Blog 폴더를 더블클릭하면 탐색기 창이 열린다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('main', { name: '바탕화면' }).getByText('Blog', { exact: true }).dblclick();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
});
