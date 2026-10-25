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

test('창을 최대화하면 "이전 크기로 복원" 버튼으로 바뀌고, 누르면 원래 크기로 돌아간다', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  await expect(explorer).toBeVisible();
  const before = await explorer.boundingBox();

  await explorer.getByRole('button', { name: '최대화' }).click();
  const restoreButton = explorer.getByRole('button', { name: '이전 크기로 복원' });
  await expect(restoreButton).toBeVisible();
  const viewport = page.viewportSize();
  await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(viewport?.width);

  await restoreButton.click();
  await expect(explorer.getByRole('button', { name: '최대화' })).toBeVisible();
  await expect.poll(async () => await explorer.boundingBox()).toEqual(before);
});
