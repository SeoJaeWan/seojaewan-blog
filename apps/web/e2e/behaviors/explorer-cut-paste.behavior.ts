import { expect } from '@playwright/test';

import { openBlogFolder } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '탐색기에서 항목을 잘라 붙이고 만들고 지운다',
  area: '탐색기',
  summary: '다른 폴더로 옮김·길게 눌러 옮김',
  conditions: {
    target: {
      label: '붙일 자리',
      values: ['다른 폴더', '바탕화면', '다른 탐색기 창', '옮길 수 없는 곳'],
      base: '다른 폴더',
    },
    input: {
      label: '입력 방식',
      values: ['키보드', '마우스', '터치'],
      base: '키보드',
    },
    command: {
      label: '이어서 쓰는 명령',
      values: ['새로 만들기·삭제·자세히 보기', '없음', '이름 바꾸기', '정렬'],
      base: '새로 만들기·삭제·자세히 보기',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  requires: [{ when: { input: '터치' }, then: { screen: '모바일', command: '없음' } }],
  cases: [
    {
      id: 'cut-paste-new-delete-details',
      result: '옮기고, 만들고 지우고, 자세히 보기',
      scenario:
        'Blog 폴더 탐색기에서 React 폴더를 Ctrl+X로 잘라 Next.js 폴더 안에서 Ctrl+V로 붙이고, 새로 만들기로 "메모" 폴더를 만들어 우클릭 메뉴의 삭제로 지운 뒤 자세히 보기로 바꾼다',
      expected: [
        'React가 Next.js 폴더 안으로 옮겨진다',
        '새로 만들기를 누르면 이름 칸에 "새 폴더"가 들어 있다',
        '"메모"로 이름을 정하면 폴더가 생긴다',
        '우클릭 메뉴의 삭제로 "메모"가 사라진다',
        '자세히 보기로 바꾸면 "수정한 날짜" 열이 보인다',
      ],
      docs: ['[[파일 탐색기:조작]]', '[[파일 탐색기:보기와 정렬]]', '[[파일 탐색기:우클릭 메뉴]]'],
      async run({ page, check }) {
        await page.goto('/');
        await openBlogFolder(page);
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await content.getByRole('option', { name: 'React', exact: true }).click();
        await page.keyboard.press('Control+X');
        await content.getByRole('option', { name: 'Next.js', exact: true }).dblclick();
        await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
        await content.click({ position: { x: 400, y: 300 } });
        await page.keyboard.press('Control+V');
        await check('React가 Next.js 폴더 안으로 옮겨진다', async () => {
          await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();
        });

        await explorer.getByRole('button', { name: '새로 만들기' }).click();
        const field = explorer.getByRole('textbox', { name: '새 이름' });
        await check('새로 만들기를 누르면 이름 칸에 "새 폴더"가 들어 있다', async () => {
          await expect(field).toHaveValue('새 폴더');
        });
        await field.fill('메모');
        await field.press('Enter');
        const memo = content.getByRole('option', { name: '메모', exact: true });
        await check('"메모"로 이름을 정하면 폴더가 생긴다', async () => {
          await expect(memo).toBeVisible();
        });
        await memo.click({ button: 'right' });
        await page.getByRole('menuitem', { name: /삭제/ }).click();
        await check('우클릭 메뉴의 삭제로 "메모"가 사라진다', async () => {
          await expect(memo).not.toBeAttached();
        });

        await explorer.getByRole('button', { name: '자세히' }).click();
        await check('자세히 보기로 바꾸면 "수정한 날짜" 열이 보인다', async () => {
          await expect(explorer.getByRole('button', { name: '수정한 날짜' })).toBeVisible();
        });
      },
    },
    {
      id: 'touch-long-press',
      result: '길게 눌러 메뉴로 옮김',
      change: { input: '터치' },
      device: 'Pixel 7',
      scenario:
        '모바일에서 Blog 폴더를 탭해 연 탐색기의 React 폴더를 길게 눌러 메뉴의 잘라내기를 탭하고, Next.js 폴더를 탭해 들어가 빈 곳을 길게 눌러 메뉴의 붙여넣기를 탭한다',
      expected: [
        '길게 누르면 메뉴가 뜨고 모바일에 없는 "새 탭에서 열기"는 없다',
        '손을 뗀 뒤 따라오는 클릭이 폴더를 열지 않아 창이 Blog 폴더에 그대로 있다',
        'Next.js 폴더 빈 곳의 메뉴에서 붙여넣기를 쓸 수 있다',
        'React가 Next.js 폴더 안으로 옮겨진다',
      ],
      docs: [
        '[[반응형:입력 차이]]',
        '[[파일 탐색기:우클릭 메뉴]]',
        '[[항목 조작:잘라내기와 붙여넣기]]',
      ],
      async run({ page, touch, check }) {
        await page.goto('/');
        await touch.tap(
          page
            .getByRole('listbox', { name: '바탕화면 아이콘' })
            .getByRole('option', { name: 'Blog' }),
        );
        const explorer = page.getByRole('region', { name: /- 파일 탐색기$/ });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });

        await touch.longPress(content.getByRole('option', { name: 'React', exact: true }));
        const cut = page.getByRole('menuitem', { name: /^잘라내기/ });
        await check('길게 누르면 메뉴가 뜨고 모바일에 없는 "새 탭에서 열기"는 없다', async () => {
          await expect(cut).toBeVisible();
          await expect(page.getByRole('menuitem', { name: '새 탭에서 열기' })).toHaveCount(0);
        });
        await touch.tap(cut);
        await expect(cut).toBeHidden();
        await check(
          '손을 뗀 뒤 따라오는 클릭이 폴더를 열지 않아 창이 Blog 폴더에 그대로 있다',
          async () => {
            await expect(page.getByRole('region', { name: 'Blog - 파일 탐색기' })).toBeVisible();
          },
        );

        await touch.tap(content.getByRole('option', { name: 'Next.js', exact: true }));
        await expect(page.getByRole('region', { name: 'Next.js - 파일 탐색기' })).toBeVisible();
        const box = await content.boundingBox();
        if (box === null) {
          throw new Error('폴더 내용 자리를 알 수 없다');
        }
        await touch.longPress({ x: box.x + box.width / 2, y: box.y + box.height - 40 });
        const paste = page.getByRole('menuitem', { name: /^붙여넣기/ });
        await check('Next.js 폴더 빈 곳의 메뉴에서 붙여넣기를 쓸 수 있다', async () => {
          await expect(paste).toBeEnabled();
        });
        await touch.tap(paste);
        await check('React가 Next.js 폴더 안으로 옮겨진다', async () => {
          await expect(content.getByRole('option', { name: 'React', exact: true })).toBeVisible();
        });
      },
    },
  ],
});
