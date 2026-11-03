import { expect } from '@playwright/test';

import { readWorkspaceStorage } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '휴지통에 보냈다가 되살린다',
  area: '탐색기',
  conditions: {
    item: {
      label: '보낸 항목',
      values: ['폴더', 'Blog 폴더', '글', '외부 링크'],
      base: '폴더',
    },
    spot: {
      label: '돌아갈 자리',
      values: ['같은 이름 폴더가 있음', '비어 있음', '원래 상위 폴더가 휴지통에 있음'],
      base: '같은 이름 폴더가 있음',
    },
    how: {
      label: '되살리는 법',
      values: ['명령 모음의 복원', '우클릭 메뉴의 복원', '새로고침'],
      base: '명령 모음의 복원',
    },
    search: {
      label: '보낸 동안 검색',
      values: ['보낸 동안 찾음', '찾지 않음'],
      base: '보낸 동안 찾음',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'restore-with-number',
      scenario:
        'Blog 폴더 탐색기에서 React 폴더를 Delete로 휴지통에 보내 "react 19"를 검색해 보고, 같은 이름 "React" 폴더를 새로 만든 뒤 휴지통에서 React를 골라 복원 버튼을 누른다',
      expected: [
        'React 폴더가 Blog 폴더에서 사라진다',
        '휴지통에 보낸 폴더 안의 글은 검색에 나오지 않는다',
        '복원하면 휴지통이 빈다',
        '이름이 겹쳐 "React (2)"로 복원되고 새로 만든 "React"도 그대로 있다',
        '복원한 폴더 안의 글이 다시 검색된다',
      ],
      docs: ['[[휴지통:복원]]', '[[휴지통:기본 규칙]]', '[[검색:검색 대상]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        const blog = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = blog.getByRole('listbox', { name: '폴더 내용' });

        await content.getByRole('option', { name: 'React', exact: true }).click();
        await page.keyboard.press('Delete');
        await check('React 폴더가 Blog 폴더에서 사라진다', async () => {
          await expect(
            content.getByRole('option', { name: 'React', exact: true }),
          ).not.toBeAttached();
        });

        const searchBox = page.getByPlaceholder('검색', { exact: true });
        await searchBox.fill('react 19');
        await check('휴지통에 보낸 폴더 안의 글은 검색에 나오지 않는다', async () => {
          await expect(
            page.getByRole('dialog', { name: '검색' }).getByText('검색 결과 없음'),
          ).toBeVisible();
        });
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
        await check('복원하면 휴지통이 빈다', async () => {
          await expect(binContent.getByRole('option')).toHaveCount(0);
        });

        await check(
          '이름이 겹쳐 "React (2)"로 복원되고 새로 만든 "React"도 그대로 있다',
          async () => {
            await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();
            await expect(
              content.getByRole('option', { name: 'React (2)', exact: true }),
            ).toBeVisible();
          },
        );

        await searchBox.fill('react 19');
        await check('복원한 폴더 안의 글이 다시 검색된다', async () => {
          await expect(
            page.getByRole('dialog', { name: '검색' }).getByText('React 19 훅 정리').first(),
          ).toBeVisible();
        });
      },
    },
    {
      id: 'reload-empties-bin',
      change: { item: 'Blog 폴더', spot: '비어 있음', how: '새로고침', search: '찾지 않음' },
      scenario:
        '바탕화면에서 Blog 폴더를 골라 Delete로 휴지통에 보낸 뒤 페이지를 새로고침하고 휴지통을 연다',
      expected: [
        'Blog 폴더가 바탕화면에서 사라진다',
        '새로고침하면 Blog 폴더가 바탕화면에 돌아온다',
        '휴지통이 비어 있다',
      ],
      docs: ['[[방문자 저장:저장하지 않는 것]]', '[[휴지통:기본 규칙]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const blog = icons.getByRole('option', { name: 'Blog' });
        await blog.click();
        await page.keyboard.press('Delete');
        await check('Blog 폴더가 바탕화면에서 사라진다', async () => {
          await expect(blog).not.toBeAttached();
        });
        await expect.poll(() => readWorkspaceStorage(page)).not.toBeNull();

        await page.reload();
        await check('새로고침하면 Blog 폴더가 바탕화면에 돌아온다', async () => {
          await expect(blog).toBeVisible();
        });
        await icons.getByRole('option', { name: '휴지통' }).dblclick();
        const recycleBin = page
          .getByRole('region', { name: '휴지통 - 파일 탐색기' })
          .getByRole('listbox', { name: '폴더 내용' });
        await check('휴지통이 비어 있다', async () => {
          // 자세히 보기의 listbox는 항목만 감싸 비면 크기가 없으므로 보이는지가 아니라 있는지를 본다
          await expect(recycleBin).toBeAttached();
          await expect(recycleBin.getByRole('option')).toHaveCount(0);
        });
      },
    },
  ],
});
