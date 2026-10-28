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

// @codocs [[작업 공간:배치]]
// @codocs [[바탕화면:아이콘 우클릭 메뉴]]
test('바탕화면에서 잘라낸 아이콘을 탐색기에 붙여넣고, 탐색기에서 잘라낸 항목을 바탕화면에 붙여넣는다', async ({
  page,
}) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  const github = icons.getByRole('option', { name: 'GitHub' });
  await github.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^잘라내기/ }).click();

  await icons.getByRole('option', { name: 'Blog' }).dblclick();
  const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  const content = explorer.getByRole('listbox', { name: '폴더 내용' });
  await content.getByRole('option', { name: 'React', exact: true }).click();
  await page.keyboard.press('Control+V');
  await expect(content.getByRole('option', { name: 'GitHub' })).toBeVisible();
  await expect(github).not.toBeAttached();

  await content.getByRole('option', { name: 'GitHub' }).click();
  await page.keyboard.press('Control+X');
  // 잘라낸 항목은 창 밖에 두므로 창을 닫아도 바탕화면에 붙여넣을 수 있다.
  await explorer.getByRole('button', { name: '닫기', exact: true }).click();
  await icons.click({ button: 'right', position: { x: 500, y: 400 } });
  await page.getByRole('menuitem', { name: /^붙여넣기/ }).click();
  await expect(github).toBeVisible();
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
