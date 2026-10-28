import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'seojaewan-blog:workspace';

// @codocs [[창 동작:열기 규칙]]
test('바탕화면의 Blog 폴더와 휴지통을 열면 그 위치를 보는 탐색기 창이 열린다', async ({ page }) => {
  await page.goto('/');
  const desktop = page.getByRole('main', { name: '바탕화면' });

  await desktop.getByText('Blog', { exact: true }).dblclick();
  const blog = page
    .getByRole('region', { name: 'Blog - 파일 탐색기' })
    .getByRole('listbox', { name: '폴더 내용' });
  await expect(blog.getByText('Notion 블로그 이전기')).toBeVisible();
  await expect(blog.getByText('React', { exact: true })).toBeVisible();

  await desktop
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: '휴지통' })
    .dblclick();
  await expect(page.getByRole('region', { name: '휴지통 - 파일 탐색기' })).toBeVisible();
});

// @codocs [[작업 공간:방문자별 저장]]
// @codocs [[작업 공간:휴지통]]
test('Blog 폴더도 휴지통에 보낼 수 있고, 새로고침하면 휴지통의 항목은 원래 자리로 돌아온다', async ({
  page,
}) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  const blog = icons.getByRole('option', { name: 'Blog' });
  await blog.click();
  await page.keyboard.press('Delete');
  await expect(blog).not.toBeAttached();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .not.toBeNull();

  await page.reload();
  await expect(blog).toBeVisible();
  await icons.getByRole('option', { name: '휴지통' }).dblclick();
  const recycleBin = page
    .getByRole('region', { name: '휴지통 - 파일 탐색기' })
    .getByRole('listbox', { name: '폴더 내용' });
  await expect(recycleBin).toBeVisible();
  await expect(recycleBin.getByRole('option')).toHaveCount(0);
});

// @codocs [[작업 공간:방문자별 저장]]
// @codocs [[작업 공간:다시 시작]]
test('브라우저에 저장한 작업 공간은 새로고침 뒤에도 남고, 다시 시작하면 처음 상태로 돌아간다', async ({
  page,
}) => {
  await page.goto('/');
  const desktop = page.getByRole('main', { name: '바탕화면' });
  // 항목을 열면 최근 항목이 바뀌어 저장분이 생긴다.
  await desktop.getByText('Blog', { exact: true }).dblclick();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .not.toBeNull();

  // 방문자가 Blog 폴더 이름을 바꾼 것처럼 저장분을 고친다(이름 바꾸기 화면은 바탕화면 단계에서 붙인다).
  await page.evaluate((key) => {
    const stored = localStorage.getItem(key) ?? '';
    localStorage.setItem(key, stored.replace('"name":"Blog"', '"name":"내 블로그"'));
  }, STORAGE_KEY);
  await page.reload();
  await expect(desktop.getByText('내 블로그', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('dialog', { name: '시작' }).getByRole('button', { name: '전원' }).click();
  await page.getByRole('menuitem', { name: '다시 시작' }).click();
  await expect(page.getByRole('progressbar', { name: '다시 시작하는 중' })).not.toBeAttached();

  await expect(desktop.getByText('Blog', { exact: true })).toBeVisible();
  await expect(desktop.getByText('내 블로그', { exact: true })).not.toBeAttached();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});
