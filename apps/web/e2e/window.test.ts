import { expect, test } from '@playwright/test';

test('작업 표시줄에서 탐색기를 열고, 최소화했다가 복원한 뒤 닫는다', async ({ page }) => {
  await page.goto('/');
  const taskbarButton = page.getByRole('button', { name: '파일 탐색기' });
  const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });

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
  const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
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

// @codocs [[창 동작:창 조작]]
test('브라우저 화면이 줄면 창을 보이는 동안만 당기고, 다시 커지면 원래 자리로 돌아간다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  await expect(explorer).toBeVisible();
  const start = await explorer.boundingBox();
  if (start === null) {
    throw new Error('창 자리를 알 수 없다');
  }

  // 탭과 새 탭 버튼 오른쪽의 빈 제목 표시줄을 잡고 오른쪽으로 500px 옮긴다.
  const grab = { x: start.x + 600, y: start.y + 16 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 250, grab.y, { steps: 5 });
  await page.mouse.move(grab.x + 500, grab.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(start.x + 500);

  // 화면 폭 800에서는 제목 표시줄 200px이 남는 자리(800 - 200)까지 당겨 보이고, 창 크기는 그대로다.
  await page.setViewportSize({ width: 800, height: 720 });
  await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(600);
  await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(start.width);

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(start.x + 500);
});
