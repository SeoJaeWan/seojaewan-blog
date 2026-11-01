import { expect, type Page, test } from '@playwright/test';

async function openTwoExplorers(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
}

async function dragTitleTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

// @codocs [[스냅:끌어서 스냅]]
// @codocs [[스냅:Snap Assist]]
test('창을 화면 왼쪽 끝으로 끌어 절반에 스냅하면 남은 칸에 다른 창을 제안하고, 고르면 그 창이 남은 칸을 채운다', async ({
  page,
}) => {
  await openTwoExplorers(page);
  const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  const desktopWindow = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error('화면 크기를 알 수 없다');
  }
  const box = await blog.boundingBox();
  if (box === null) {
    throw new Error('창 자리를 알 수 없다');
  }

  await dragTitleTo(page, { x: box.x + 600, y: box.y + 16 }, { x: 2, y: 300 });
  await expect.poll(async () => (await blog.boundingBox())?.x).toBe(0);
  await expect.poll(async () => (await blog.boundingBox())?.width).toBe(viewport.width / 2);

  const assist = page.getByRole('dialog', { name: 'Snap Assist' });
  await expect(assist).toBeVisible();
  await assist.locator('[data-snap-assist-suggestion]').first().click();
  await expect(assist).not.toBeAttached();
  await expect.poll(async () => (await desktopWindow.boundingBox())?.x).toBe(viewport.width / 2);
  await expect
    .poll(async () => (await desktopWindow.boundingBox())?.width)
    .toBe(viewport.width / 2);
});

// @codocs [[스냅:스냅 레이아웃]]
// @codocs [[스냅:스냅된 창]]
test('최대화 버튼에 올려 스냅 레이아웃의 칸을 고르면 그 자리를 채우고, 최대화했다가 복원하면 그 칸으로 돌아온다', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  await expect(explorer).toBeVisible();
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error('화면 크기를 알 수 없다');
  }

  await explorer.getByRole('button', { name: '최대화' }).hover();
  const layouts = page.getByRole('dialog', { name: '스냅 레이아웃' });
  await expect(layouts).toBeVisible();
  await layouts
    .getByRole('group', { name: '반반' })
    .getByRole('button', { name: '오른쪽 절반' })
    .click();
  await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(viewport.width / 2);
  await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(viewport.width / 2);
  const snapped = await explorer.boundingBox();

  await explorer.getByRole('button', { name: '최대화' }).click();
  await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(viewport.width);
  await explorer.getByRole('button', { name: '이전 크기로 복원' }).click();
  await expect.poll(async () => await explorer.boundingBox()).toEqual(snapped);
});
