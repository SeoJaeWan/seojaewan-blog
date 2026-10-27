import { expect, test } from '@playwright/test';

// @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
// @codocs [[바탕화면:아이콘 조작]]
test('바탕화면에서 새 폴더를 만들어 이름을 바꾸고, Delete로 휴지통에 보낸다', async ({ page }) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  await expect(icons.getByRole('option', { name: 'Blog' })).toBeVisible();

  await icons.click({ button: 'right', position: { x: 500, y: 400 } });
  await page.getByRole('menuitem', { name: '새로 만들기' }).hover();
  await page.getByRole('menuitem', { name: '폴더' }).click();

  const field = page.getByRole('textbox', { name: '새 이름' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('새 폴더');
  await field.fill('메모');
  await field.press('Enter');

  const folder = icons.getByRole('option', { name: '메모' });
  await expect(folder).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(folder).not.toBeAttached();

  await icons.getByRole('option', { name: '휴지통' }).dblclick();
  await expect(
    page.getByRole('region', { name: '휴지통 - 파일 탐색기' }).getByText('메모'),
  ).toBeVisible();
});

// @codocs [[바탕화면:아이콘 조작]]
test('아이콘을 끌어 폴더 위에 놓으면 그 폴더로 들어간다', async ({ page }) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  const github = icons.getByRole('option', { name: 'GitHub' });
  await github.dragTo(icons.getByRole('option', { name: 'Blog' }));
  await expect(github).not.toBeAttached();

  await icons.getByRole('option', { name: 'Blog' }).dblclick();
  await expect(
    page.getByRole('region', { name: 'Blog - 파일 탐색기' }).getByText('GitHub'),
  ).toBeVisible();
});
