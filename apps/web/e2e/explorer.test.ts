import { expect, test } from '@playwright/test';

// @codocs [[파일 탐색기:조작]]
// @codocs [[파일 탐색기:탭]]
test('탐색기에서 폴더를 옮겨 다니고, 탭을 열고 닫는다', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  const content = explorer.getByRole('group', { name: '폴더 내용' });

  await content.getByText('React', { exact: true }).dblclick();
  await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
  await expect(content.getByText('React 19 훅 정리')).toBeVisible();

  await explorer.getByRole('button', { name: '뒤로' }).click();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '앞으로' }).click();
  await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();

  await explorer.getByRole('tree', { name: '탐색 창' }).getByText('Next.js').click();
  await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '바탕 화면' }).click();
  await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
  await expect(explorer.getByRole('button', { name: '위로' })).toBeDisabled();

  await explorer.getByRole('button', { name: '새 탭' }).click();
  await expect(explorer.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();

  await explorer
    .getByRole('tab', { name: /Blog/ })
    .getByRole('button', { name: '탭 닫기' })
    .click();
  await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '탭 닫기' }).click();
  await expect(explorer).not.toBeAttached();
});
