import { expect, test } from '@playwright/test';

// @codocs [[휴지통:복원]]
// @codocs [[휴지통:기본 규칙]]
// @codocs [[검색:검색 대상]]
test('폴더를 휴지통에 보내면 검색에서 빠지고, 같은 이름의 새 폴더가 있으면 번호를 붙여 복원한다', async ({
  page,
}) => {
  await page.goto('/');
  const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
  await icons.getByRole('option', { name: 'Blog' }).dblclick();
  const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
  const content = blog.getByRole('listbox', { name: '폴더 내용' });

  await content.getByRole('option', { name: 'React', exact: true }).click();
  await page.keyboard.press('Delete');
  await expect(content.getByRole('option', { name: 'React', exact: true })).not.toBeAttached();

  // 휴지통에 든 폴더 안의 글은 검색에 나오지 않는다.
  const searchBox = page.getByPlaceholder('검색', { exact: true });
  await searchBox.fill('react 19');
  await expect(
    page.getByRole('dialog', { name: '검색' }).getByText('검색 결과 없음'),
  ).toBeVisible();
  await searchBox.fill('');
  await page.keyboard.press('Escape');

  // 같은 이름의 새 폴더를 만든다.
  await blog.getByRole('button', { name: '새로 만들기' }).click();
  const field = blog.getByRole('textbox', { name: '새 이름' });
  await field.fill('React');
  await field.press('Enter');
  await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();

  await icons.getByRole('option', { name: '휴지통' }).dblclick();
  const bin = page.getByRole('region', { name: '휴지통 - 파일 탐색기' });
  const binContent = bin.getByRole('listbox', { name: '폴더 내용' });
  await binContent.getByRole('option', { name: /React/ }).click();
  await bin.getByRole('button', { name: '복원' }).click();
  await expect(binContent.getByRole('option')).toHaveCount(0);

  await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();
  await expect(content.getByRole('option', { name: 'React (2)', exact: true })).toBeVisible();

  // 복원한 폴더 안의 글은 다시 검색된다.
  await searchBox.fill('react 19');
  await expect(
    page.getByRole('dialog', { name: '검색' }).getByText('React 19 훅 정리').first(),
  ).toBeVisible();
});
