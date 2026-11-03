import { expect } from '@playwright/test';

import { readWorkspaceStorage } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면에서 폴더를 만들고 이름을 바꾼다',
  area: '바탕화면',
  summary: '만들고 지움·F2로 바꿈·새로고침 뒤 남음',
  conditions: {
    start: {
      label: '이름 바꾸기를 시작하는 방법',
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
      label: '그다음에',
      values: ['Delete로 휴지통', '새로고침', '다시 시작', '없음'],
      base: 'Delete로 휴지통',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'new-rename-delete',
      result: '만들어 이름 짓고 휴지통으로',
      scenario:
        '바탕화면 빈 곳을 우클릭해 새로 만들기 > 폴더로 폴더를 만들고, 이름을 메모로 바꿔 Enter한 뒤 Delete를 눌러 휴지통으로 보낸다',
      expected: [
        '이름 입력칸이 포커스를 받고 새 폴더가 들어 있다',
        'Enter하면 메모 폴더가 선택된다',
        'Delete를 누르면 메모가 바탕화면에서 사라진다',
        '휴지통을 열면 메모가 들어 있다',
      ],
      docs: ['[[바탕화면 우클릭 메뉴:빈 곳]]', '[[항목 조작:단축키]]', '[[항목과 폴더:폴더 이름]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        await expect(icons.getByRole('option', { name: 'Blog' })).toBeVisible();

        await icons.click({ button: 'right', position: { x: 500, y: 400 } });
        await page.getByRole('menuitem', { name: '새로 만들기' }).hover();
        await page.getByRole('menuitem', { name: '폴더' }).click();

        const field = page.getByRole('textbox', { name: '새 이름' });
        await check('이름 입력칸이 포커스를 받고 새 폴더가 들어 있다', async () => {
          await expect(field).toBeFocused();
          await expect(field).toHaveValue('새 폴더');
        });
        await field.fill('메모');
        await field.press('Enter');

        const folder = icons.getByRole('option', { name: '메모' });
        await check('Enter하면 메모 폴더가 선택된다', async () => {
          await expect(folder).toBeFocused();
        });
        await page.keyboard.press('Delete');
        await check('Delete를 누르면 메모가 바탕화면에서 사라진다', async () => {
          await expect(folder).not.toBeAttached();
        });

        await icons.getByRole('option', { name: '휴지통' }).dblclick();
        await check('휴지통을 열면 메모가 들어 있다', async () => {
          await expect(
            page.getByRole('region', { name: '휴지통 - 파일 탐색기' }).getByText('메모'),
          ).toBeVisible();
        });
      },
    },
    {
      id: 'f2-rename',
      change: { start: 'F2' },
      result: 'F2 입력칸에 원래 이름',
      scenario: '바탕화면에서 만든 메모 폴더를 F2로 일기로 바꾸고, Delete를 눌러 휴지통으로 보낸다',
      expected: [
        'F2 이름 입력칸에 메모가 들어 있다',
        '바탕화면에 일기만 보이고 메모는 없다',
        'Delete를 누르면 일기가 바탕화면에서 사라진다',
        '휴지통을 열면 일기가 들어 있다',
      ],
      docs: ['[[항목 조작:단축키]]', '[[항목과 폴더:폴더 이름]]'],
      async run({ page, check }) {
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
        await check('F2 이름 입력칸에 메모가 들어 있다', async () => {
          await expect(renameField).toHaveValue('메모');
        });
        await renameField.fill('일기');
        await renameField.press('Enter');
        const renamed = icons.getByRole('option', { name: '일기' });
        await check('바탕화면에 일기만 보이고 메모는 없다', async () => {
          await expect(renamed).toBeVisible();
          await expect(folder).not.toBeAttached();
        });

        await page.keyboard.press('Delete');
        await check('Delete를 누르면 일기가 바탕화면에서 사라진다', async () => {
          await expect(renamed).not.toBeAttached();
        });
        await icons.getByRole('option', { name: '휴지통' }).dblclick();
        await check('휴지통을 열면 일기가 들어 있다', async () => {
          await expect(
            page.getByRole('region', { name: '휴지통 - 파일 탐색기' }).getByText('일기'),
          ).toBeVisible();
        });
      },
    },
    {
      id: 'reload-keeps-folder',
      change: { after: '새로고침' },
      result: '새로고침 뒤에도 남음',
      scenario:
        '바탕화면 빈 곳을 우클릭해 새로 만들기 > 폴더로 폴더를 만들고 이름을 메모로 바꿔 Enter한 뒤 페이지를 새로고침하고, 파일 탐색기의 바탕 화면 폴더를 연다',
      expected: [
        '바뀐 이름이 브라우저 저장분에 담긴다',
        '새로고침 뒤에도 바탕화면에 메모가 있다',
        '새로고침 뒤 탐색기 바탕 화면 폴더에도 메모가 보인다',
      ],
      docs: ['[[방문자 저장:저장하는 것]]', '[[바탕화면 우클릭 메뉴:빈 곳]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });

        await icons.click({ button: 'right', position: { x: 500, y: 400 } });
        await page.getByRole('menuitem', { name: '새로 만들기' }).hover();
        await page.getByRole('menuitem', { name: '폴더' }).click();
        const field = page.getByRole('textbox', { name: '새 이름' });
        await field.fill('메모');
        await field.press('Enter');
        await expect(icons.getByRole('option', { name: '메모' })).toBeFocused();
        await check('바뀐 이름이 브라우저 저장분에 담긴다', async () => {
          await expect.poll(() => readWorkspaceStorage(page)).toContain('메모');
        });

        await page.reload();
        await check('새로고침 뒤에도 바탕화면에 메모가 있다', async () => {
          await expect(icons.getByRole('option', { name: '메모' })).toBeVisible();
        });
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await check('새로고침 뒤 탐색기 바탕 화면 폴더에도 메모가 보인다', async () => {
          await expect(
            explorer
              .getByRole('listbox', { name: '폴더 내용' })
              .getByRole('option', { name: '메모' }),
          ).toBeVisible();
        });
      },
    },
  ],
});
