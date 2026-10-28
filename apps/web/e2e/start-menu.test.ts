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

// @codocs [[Start 메뉴:구성]]
test('화면이 아주 낮아도 Start 패널은 검색칸과 프로필·전원 줄을 더한 높이보다 줄지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 200 });
  await page.goto('/');

  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  await expect(startMenu).toBeVisible();

  const panel = await startMenu.locator(':scope > *').first().boundingBox();
  const searchBox = await startMenu
    .getByRole('searchbox', { name: '시작 메뉴 검색' })
    .boundingBox();
  const powerButton = await startMenu.getByRole('button', { name: '전원' }).boundingBox();
  if (panel === null || searchBox === null || powerButton === null) {
    throw new Error('Start 패널을 찾지 못했다');
  }
  // 작업 영역(200 - 작업 표시줄 48)에서 틈 12를 빼면 140이지만, 위쪽과 아래쪽을 더한 높이(151)에서 멈춘다
  expect(panel.height).toBe(151);
  expect(searchBox.y).toBeGreaterThanOrEqual(panel.y);
  expect(powerButton.y).toBeGreaterThanOrEqual(searchBox.y + searchBox.height);
  expect(powerButton.y + powerButton.height).toBeLessThanOrEqual(panel.y + panel.height);
});

// @codocs [[Start 메뉴:모두]]
test('Start 모두 목록의 줄을 우클릭해 시작 화면 고정을 해제하면 고정됨에서 빠진다', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  const pinned = startMenu.getByRole('region', { name: '고정됨' });
  const all = startMenu.getByRole('region', { name: '모두' });
  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
  await expect(all.getByRole('button', { name: '보기: 범주' })).toBeVisible();

  await all.getByRole('button', { name: 'Blog', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();

  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
  await expect(startMenu).toBeVisible();
});
