import { expect, test } from '@playwright/test';

test('Start 버튼으로 Start 메뉴를 열고, 전원 메뉴를 거쳐 Esc로 닫는다', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  await expect(startMenu).toBeVisible();

  await startMenu.getByRole('button', { name: '전원' }).click();
  await expect(page.getByRole('menuitem', { name: '다시 시작' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: '다시 시작' })).toBeHidden();
  await expect(startMenu).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(startMenu).toBeHidden();
});

test('작업 표시줄 검색칸을 누르면 검색 패널이 열리고, 바깥을 누르면 닫힌다', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: '검색' }).click();
  const searchPanel = page.getByRole('dialog', { name: '검색' });
  await expect(searchPanel).toBeVisible();

  await page.getByText('휴지통').click();
  await expect(searchPanel).toBeHidden();
});

// @codocs [[검색:결과 화면]]
// @codocs [[창 동작:열기 규칙]]
test('검색칸에 입력해 글을 찾고 방향키로 골라 Enter로 열면 Chrome 창에 열리고 검색 패널이 닫힌다', async ({
  page,
}) => {
  await page.goto('/');

  const searchBox = page.getByRole('searchbox', { name: '검색', exact: true });
  await searchBox.fill('react');
  const searchPanel = page.getByRole('dialog', { name: '검색' });
  await expect(searchPanel.getByText('최고 일치')).toBeVisible();

  await searchBox.press('ArrowDown');
  await searchBox.press('Enter');

  await expect(searchPanel).toBeHidden();
  await expect(page.getByRole('tab', { name: /React/ })).toBeVisible();
  await expect(searchBox).toHaveValue('');
});
