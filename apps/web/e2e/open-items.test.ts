import { expect, test } from '@playwright/test';

// @codocs [[Start 메뉴:열기와 닫기]]
// @codocs [[창 동작:열기 규칙]]
test('Start 고정됨의 Blog 폴더를 열면 탐색기 창이 열리고 Start가 닫힌다', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  await startMenu
    .getByRole('region', { name: '고정됨' })
    .getByRole('button', { name: 'Blog' })
    .click();

  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await expect(startMenu).toBeHidden();
});

// @codocs [[Start 메뉴:검색]]
// @codocs [[창 동작:열기 규칙]]
test('Start 검색칸으로 글을 찾아 열면 최소화된 Chrome 창이 복원되고 그 창의 새 탭이 된다', async ({
  page,
}) => {
  await page.goto('/posts/react-19-hooks');
  const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(chrome).toBeVisible();
  await chrome.getByRole('button', { name: '최소화' }).click();
  await expect(chrome).toBeHidden();

  await page.getByRole('button', { name: '시작' }).click();
  const startMenu = page.getByRole('dialog', { name: '시작' });
  const searchBox = startMenu.getByRole('searchbox', { name: '시작 메뉴 검색' });
  await searchBox.fill('app router');
  await expect(startMenu.getByText('최고 일치')).toBeVisible();
  await searchBox.press('Enter');

  await expect(startMenu).toBeHidden();
  const opened = page.getByRole('region', { name: 'Next.js App Router 캐시 - Chrome' });
  await expect(opened).toBeVisible();
  await expect(opened.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('region', { name: /- Chrome$/ })).toHaveCount(1);
  await expect(page).toHaveURL(/\/posts\/nextjs-app-router-cache$/);
});

// @codocs [[방문자 저장:저장하는 것]]
// @codocs [[항목 조작:단축키]]
test('바탕화면에서 만든 폴더의 이름을 F2로 바꾸면 새로고침 뒤에도 그 이름으로 남고 탐색기에도 같이 보인다', async ({
  page,
}) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });

  await icons.click({ button: 'right', position: { x: 500, y: 400 } });
  await page.getByRole('menuitem', { name: '새로 만들기' }).hover();
  await page.getByRole('menuitem', { name: '폴더' }).click();
  const field = page.getByRole('textbox', { name: '새 이름' });
  await field.fill('메모');
  await field.press('Enter');
  const folder = icons.getByRole('option', { name: '메모' });
  await expect(folder).toBeFocused();

  await page.keyboard.press('F2');
  const renameField = page.getByRole('textbox', { name: '새 이름' });
  await expect(renameField).toHaveValue('메모');
  await renameField.fill('일기');
  await renameField.press('Enter');
  await expect(icons.getByRole('option', { name: '일기' })).toBeVisible();
  await expect(folder).not.toBeAttached();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), 'seojaewan-blog:workspace'))
    .toContain('일기');

  await page.reload();
  await expect(icons.getByRole('option', { name: '일기' })).toBeVisible();
  await page.getByRole('button', { name: '파일 탐색기' }).click();
  const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
  await expect(
    explorer.getByRole('listbox', { name: '폴더 내용' }).getByRole('option', { name: '일기' }),
  ).toBeVisible();
});
