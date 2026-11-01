import { expect, test } from '@playwright/test';

// @codocs [[창 동작:모바일]]
// @codocs [[창 동작:새로고침과 첫 진입]]
test('모바일에서 공유 링크로 들어오면 그 글이 열린 전체화면 Chrome 창 하나로 시작한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/posts/react-19-hooks');
  const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(chrome).toBeVisible();
  await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
  await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(390);
  await expect(chrome.getByRole('tab')).toHaveCount(0);
  await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);
});

// @codocs [[창 동작:모바일]]
// @codocs [[작업 표시줄:모바일]]
// @codocs [[검색:모바일]]
test('모바일에서 탐색기로 글을 열면 전체화면 Chrome이 열리고, 작업 표시줄 앱 버튼으로 창을 오가며, 검색 버튼으로 글을 연다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .click();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  await expect(explorer).toBeVisible();
  await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(390);

  const content = explorer.getByRole('listbox', { name: '폴더 내용' });
  await content.getByRole('option', { name: 'React', exact: true }).click();
  await content.getByRole('option', { name: /^React 19 훅 정리/ }).click();
  const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(chrome).toBeVisible();
  await expect.poll(async () => (await chrome.boundingBox())?.width).toBe(390);
  await expect(page).toHaveURL(/\/posts\/react-19-hooks$/);

  // 창은 하나만 보인다. 탐색기 버튼을 누르면 탐색기가 앞으로 온다.
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
  await expect(chrome).toHaveAttribute('data-window-state', 'inactive');
  await expect(page).toHaveURL(/\/$/);

  // 검색 패널 안의 입력칸으로 글을 찾아 연다.
  await page.getByRole('button', { name: '검색', expanded: false }).click();
  const panel = page.getByRole('dialog', { name: '검색' });
  await panel.getByRole('searchbox', { name: '검색' }).fill('app router');
  await panel.getByRole('searchbox', { name: '검색' }).press('Enter');
  await expect(panel).toBeHidden();
  await expect(
    page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
});

// @codocs [[창 동작:창 조작]]
// @codocs [[반응형:기준]]
test('노트북 구간에서는 Chrome이 노트북 기본 크기로 열리고, PC 구간에서는 PC 기본 크기로 열린다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 850 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chrome' }).click();
  const laptopChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
  await expect(laptopChrome).toBeVisible();
  await expect.poll(async () => (await laptopChrome.boundingBox())?.width).toBe(1120);
  await expect.poll(async () => (await laptopChrome.boundingBox())?.height).toBe(640);

  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chrome' }).click();
  const pcChrome = page.getByRole('region', { name: '새 탭 - Chrome' });
  await expect(pcChrome).toBeVisible();
  await expect.poll(async () => (await pcChrome.boundingBox())?.width).toBe(1280);
  await expect.poll(async () => (await pcChrome.boundingBox())?.height).toBe(800);
});
