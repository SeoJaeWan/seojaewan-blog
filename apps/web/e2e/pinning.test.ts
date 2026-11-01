import { expect, type Page, test } from '@playwright/test';

async function restart(page: Page): Promise<void> {
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('dialog', { name: '시작' }).getByRole('button', { name: '전원' }).click();
  await page.getByRole('menuitem', { name: '다시 시작' }).click();
  await expect(page.getByRole('progressbar', { name: '다시 시작하는 중' })).not.toBeAttached();
}

// @codocs [[고정:시작 화면 고정]]
// @codocs [[방문자 저장:저장하는 것]]
// @codocs [[다시 시작:되돌리는 상태]]
test('바탕화면에서 고정을 해제했다가 다시 고정하면 고정됨 맨 뒤에 붙고 새로고침 뒤에도 남으며, 다시 시작하면 처음 순서로 돌아간다', async ({
  page,
}) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  const pinned = page.getByRole('dialog', { name: '시작' }).getByRole('region', { name: '고정됨' });
  const blog = icons.getByRole('option', { name: 'Blog' });

  await blog.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }).click();
  await page.getByRole('button', { name: '시작' }).click();
  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeHidden();
  await page.keyboard.press('Escape');

  await blog.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '시작 화면에 고정' }).click();
  await page.getByRole('button', { name: '시작' }).click();
  await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
  await page.keyboard.press('Escape');

  await page.reload();
  await page.getByRole('button', { name: '시작' }).click();
  await expect(pinned.getByRole('button').last()).toHaveAccessibleName('Blog');
  await page.keyboard.press('Escape');

  await restart(page);
  await page.getByRole('button', { name: '시작' }).click();
  await expect(pinned.getByRole('button').last()).toHaveAccessibleName('GitHub');
  await expect(pinned.getByRole('button', { name: 'Blog' })).toBeVisible();
});

// @codocs [[작업 표시줄:고정과 순서]]
// @codocs [[작업 표시줄:우클릭 메뉴]]
// @codocs [[고정:작업 표시줄 고정]]
test('작업 표시줄의 고정을 해제한 앱은 창이 열려 있는 동안만 보이고, 다시 시작하면 고정이 돌아온다', async ({
  page,
}) => {
  await page.goto('/');
  const taskbarChrome = page.getByRole('button', { name: 'Chrome' });
  await taskbarChrome.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '작업 표시줄에서 고정 해제' }).click();
  await expect(taskbarChrome).toBeHidden();

  await page.goto('/posts/react-19-hooks');
  const chrome = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
  await expect(chrome).toBeVisible();
  await expect(taskbarChrome).toBeVisible();

  await chrome.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(chrome).not.toBeAttached();
  await expect(taskbarChrome).toBeHidden();

  await page.reload();
  await expect(page.getByRole('button', { name: '파일 탐색기' })).toBeVisible();
  await expect(taskbarChrome).toBeHidden();

  await restart(page);
  await expect(taskbarChrome).toBeVisible();
});
