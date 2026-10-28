import { expect, test } from '@playwright/test';

// @codocs [[파일 탐색기:조작]]
// @codocs [[파일 탐색기:탭]]
// @codocs [[창 동작:열기 규칙]]
test('탐색기에서 폴더를 옮겨 다니고, 탭을 열고 닫는다', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  const content = explorer.getByRole('listbox', { name: '폴더 내용' });

  await content.getByText('React', { exact: true }).dblclick();
  await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();
  await expect(content.getByText('React 19 훅 정리')).toBeVisible();

  await explorer.getByRole('button', { name: '뒤로' }).click();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '앞으로' }).click();
  await expect(page.getByRole('region', { name: 'React - 파일 탐색기' })).toBeVisible();

  await explorer.getByRole('tree', { name: '탐색 창' }).getByText('Next.js').click();
  await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '바탕 화면' }).click();
  await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();
  await expect(explorer.getByRole('button', { name: '위로' })).toBeDisabled();

  await explorer.getByRole('tree', { name: '탐색 창' }).getByText('Blog').click();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '새 탭' }).click();
  await expect(explorer.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' })).toBeVisible();

  await explorer
    .getByRole('tab', { name: /바탕 화면/ })
    .locator('..')
    .getByRole('button', { name: '탭 닫기' })
    .click();
  await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
  await explorer.getByRole('button', { name: '탭 닫기' }).click();
  await expect(explorer).not.toBeAttached();
});

// @codocs [[파일 탐색기:조작]]
// @codocs [[파일 탐색기:보기와 정렬]]
// @codocs [[파일 탐색기:우클릭 메뉴]]
test('탐색기에서 항목을 잘라 붙이고, 새 폴더를 만들어 지우고, 자세히 보기로 바꾼다', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  const content = explorer.getByRole('listbox', { name: '폴더 내용' });

  await content.getByRole('option', { name: 'React', exact: true }).click();
  await page.keyboard.press('Control+X');
  await content.getByRole('option', { name: 'Next.js', exact: true }).dblclick();
  await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
  await content.click({ position: { x: 400, y: 300 } });
  await page.keyboard.press('Control+V');
  await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();

  await explorer.getByRole('button', { name: '새로 만들기' }).click();
  const field = explorer.getByRole('textbox', { name: '새 이름' });
  await expect(field).toHaveValue('새 폴더');
  await field.fill('메모');
  await field.press('Enter');
  const memo = content.getByRole('option', { name: '메모', exact: true });
  await expect(memo).toBeVisible();
  await memo.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /삭제/ }).click();
  await expect(memo).not.toBeAttached();

  await explorer.getByRole('button', { name: '자세히' }).click();
  await expect(explorer.getByRole('button', { name: '수정한 날짜' })).toBeVisible();
});

// @codocs [[파일 탐색기:조작]]
// @codocs [[파일 탐색기:폴더 안 검색]]
test('탐색기 항목을 탐색 창 폴더로 끌어 옮기고, 폴더 안에서 초성으로 찾는다', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('listbox', { name: '바탕화면 아이콘' })
    .getByRole('option', { name: 'Blog' })
    .dblclick();
  const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
  const content = explorer.getByRole('listbox', { name: '폴더 내용' });
  const tree = explorer.getByRole('tree', { name: '탐색 창' });

  await content
    .getByRole('option', { name: '2026 상반기 회고', exact: true })
    .dragTo(tree.getByRole('treeitem', { name: 'Next.js' }));
  await expect(
    content.getByRole('option', { name: '2026 상반기 회고', exact: true }),
  ).not.toBeAttached();

  await explorer.getByRole('searchbox', { name: '검색' }).fill('ㅎㄱ');
  await expect(content.getByRole('option', { name: /^2026 상반기 회고/ })).toBeVisible();
  await expect(explorer.getByRole('button', { name: '위치' })).toBeVisible();
});
