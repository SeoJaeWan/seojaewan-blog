import { expect } from '@playwright/test';

import { readWorkspaceStorage } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면에서 폴더를 만들고 이름을 바꾼다',
  area: '바탕화면',
  conditions: {
    start: {
      label: '이름 바꾸기 시작',
      values: ['새로 만들기', 'F2', '메뉴의 이름 바꾸기'],
      base: '새로 만들기',
    },
    name: {
      label: '입력한 이름',
      values: [
        '쓸 수 있는 이름',
        '쓸 수 없는 문자',
        '255자 넘음',
        '빈 이름',
        '끝 공백·마침표',
        '예약 이름',
        '같은 위치의 같은 이름 폴더',
      ],
      base: '쓸 수 있는 이름',
    },
    after: {
      label: '그 뒤',
      values: ['Delete로 휴지통', '새로고침', '다시 시작', '없음'],
      base: 'Delete로 휴지통',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'new-rename-delete',
      purpose: '바탕화면에서 새 폴더를 만들어 이름을 바꾸고, Delete로 휴지통에 보낸다',
      docs: ['[[바탕화면 우클릭 메뉴:빈 곳]]', '[[항목 조작:단축키]]', '[[항목과 폴더:폴더 이름]]'],
      async run({ page }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        await expect(icons.getByRole('option', { name: 'Blog' })).toBeVisible();

        await icons.click({ button: 'right', position: { x: 500, y: 400 } });
        await page.getByRole('menuitem', { name: '새로 만들기' }).hover();
        await page.getByRole('menuitem', { name: '폴더' }).click();

        const field = page.getByRole('textbox', { name: '새 이름' });
        await expect(field).toBeFocused();
        await expect(field).toHaveValue('새 폴더');
        await field.fill('메모');
        await field.press('Enter');

        const folder = icons.getByRole('option', { name: '메모' });
        await expect(folder).toBeFocused();
        await page.keyboard.press('Delete');
        await expect(folder).not.toBeAttached();

        await icons.getByRole('option', { name: '휴지통' }).dblclick();
        await expect(
          page.getByRole('region', { name: '휴지통 - 파일 탐색기' }).getByText('메모'),
        ).toBeVisible();
      },
    },
    {
      id: 'f2-then-reload',
      change: { start: 'F2', after: '새로고침' },
      purpose:
        '바탕화면에서 만든 폴더의 이름을 F2로 바꾸면 새로고침 뒤에도 그 이름으로 남고 탐색기에도 같이 보인다',
      docs: ['[[방문자 저장:저장하는 것]]', '[[항목 조작:단축키]]'],
      async run({ page }) {
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
        await expect.poll(() => readWorkspaceStorage(page)).toContain('일기');

        await page.reload();
        await expect(icons.getByRole('option', { name: '일기' })).toBeVisible();
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(
          explorer
            .getByRole('listbox', { name: '폴더 내용' })
            .getByRole('option', { name: '일기' }),
        ).toBeVisible();
      },
    },
  ],
});
