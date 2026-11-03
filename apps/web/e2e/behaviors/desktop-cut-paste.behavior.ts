import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면과 탐색기 사이에서 잘라 붙인다',
  area: '바탕화면',
  summary: '탐색기로·바탕화면으로·창 닫고·길게 눌러 옮김',
  conditions: {
    from: {
      label: '처음 잘라낸 곳',
      values: ['바탕화면', '탐색기'],
      base: '바탕화면',
    },
    input: {
      label: '입력 방식',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
    },
    between: {
      label: '붙이기 전에',
      values: ['바로 붙임', '탐색기 창을 닫음', '잘라낸 항목을 휴지통에 보냄'],
      base: '바로 붙임',
    },
    target: {
      label: '붙일 자리',
      values: ['옮길 수 있는 곳', '옮길 수 없는 곳'],
      base: '옮길 수 있는 곳',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  requires: [{ when: { input: '터치' }, then: { screen: '모바일' } }],
  cases: [
    {
      id: 'desktop-to-explorer',
      result: '탐색기 Blog 폴더로 옮겨짐',
      scenario:
        '바탕화면 GitHub 아이콘을 우클릭 메뉴의 잘라내기로 잘라, Blog 폴더 탐색기에서 Ctrl+V로 붙여넣는다',
      expected: ['GitHub이 탐색기 Blog 폴더에 나타난다', 'GitHub이 바탕화면에서 사라진다'],
      docs: ['[[항목 조작:잘라내기와 붙여넣기]]', '[[바탕화면 우클릭 메뉴:아이콘]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const github = icons.getByRole('option', { name: 'GitHub' });
        await github.click({ button: 'right' });
        await page.getByRole('menuitem', { name: /^잘라내기/ }).click();

        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).click();
        await page.keyboard.press('Control+V');
        await check('GitHub이 탐색기 Blog 폴더에 나타난다', async () => {
          await expect(content.getByRole('option', { name: 'GitHub' })).toBeVisible();
        });
        await check('GitHub이 바탕화면에서 사라진다', async () => {
          await expect(github).not.toBeAttached();
        });
      },
    },
    {
      id: 'explorer-to-desktop',
      change: { from: '탐색기' },
      result: '바탕화면으로 옮겨짐',
      scenario:
        '탐색기 Blog 폴더에서 React 폴더를 Ctrl+X로 잘라, 창을 닫지 않고 바탕화면 빈 곳 우클릭 메뉴의 붙여넣기로 붙인다',
      expected: ['React가 바탕화면에 붙는다', 'Blog 폴더에 React가 없다'],
      docs: ['[[항목 조작:잘라내기와 붙여넣기]]', '[[바탕화면 우클릭 메뉴:빈 곳]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).click();
        await page.keyboard.press('Control+X');
        // 열린 탐색기 창에 가려지지 않는 오른쪽 아래 빈 곳을 우클릭한다.
        const box = await icons.boundingBox();
        if (box === null) {
          throw new Error('바탕화면 아이콘 자리를 알 수 없다');
        }
        await icons.click({
          button: 'right',
          position: { x: box.width - 40, y: box.height - 40 },
        });
        await page.getByRole('menuitem', { name: /^붙여넣기/ }).click();
        await check('React가 바탕화면에 붙는다', async () => {
          await expect(icons.getByRole('option', { name: 'React', exact: true })).toBeVisible();
        });
        await check('Blog 폴더에 React가 없다', async () => {
          await expect(content.getByRole('option', { name: 'Next.js' })).toBeVisible();
          await expect(content.getByRole('option', { name: 'React', exact: true })).toHaveCount(0);
        });
      },
    },
    {
      id: 'touch-long-press',
      change: { input: '터치' },
      result: '길게 눌러 메뉴로 옮김',
      device: 'Pixel 7',
      scenario:
        '모바일에서 GitHub 아이콘을 길게 눌러 잘라내고, Blog를 탭해 연 탐색기의 빈 곳을 길게 눌러 붙여넣는다',
      expected: [
        '길게 누르면 메뉴가 뜨고, 손을 뗀 뒤의 클릭이 링크를 새 탭으로 열지 않는다',
        '탐색기 빈 곳의 메뉴에서 붙여넣기를 쓸 수 있다',
        'GitHub이 탐색기 Blog 폴더로 옮겨진다',
      ],
      docs: [
        '[[반응형:입력 차이]]',
        '[[바탕화면 우클릭 메뉴:모바일]]',
        '[[항목 조작:잘라내기와 붙여넣기]]',
      ],
      async run({ page, context, touch, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const github = icons.getByRole('option', { name: 'GitHub' });

        await touch.longPress(github);
        const cut = page.getByRole('menuitem', { name: /^잘라내기/ });
        await check(
          '길게 누르면 메뉴가 뜨고, 손을 뗀 뒤의 클릭이 링크를 새 탭으로 열지 않는다',
          async () => {
            await expect(cut).toBeVisible();
            expect(context.pages()).toHaveLength(1);
          },
        );
        await touch.tap(cut);
        await expect(cut).toBeHidden();

        await touch.tap(icons.getByRole('option', { name: 'Blog' }));
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await expect(content).toBeVisible();
        const box = await content.boundingBox();
        if (box === null) {
          throw new Error('폴더 내용 자리를 알 수 없다');
        }
        await touch.longPress({ x: box.x + box.width / 2, y: box.y + box.height - 40 });
        const paste = page.getByRole('menuitem', { name: /^붙여넣기/ });
        await check('탐색기 빈 곳의 메뉴에서 붙여넣기를 쓸 수 있다', async () => {
          await expect(paste).toBeEnabled();
        });
        await touch.tap(paste);
        await check('GitHub이 탐색기 Blog 폴더로 옮겨진다', async () => {
          await expect(content.getByRole('option', { name: 'GitHub' })).toBeVisible();
        });
      },
    },
    {
      id: 'explorer-to-desktop-after-close',
      change: { between: '탐색기 창을 닫음' },
      combine: {
        change: { from: '탐색기' },
        reason: '탐색기 창을 닫아도 붙는지는 탐색기에서 잘라낸 뒤에만 볼 수 있다',
      },
      result: '창을 닫아도 붙음',
      scenario:
        '탐색기 Blog 폴더에서 React 폴더를 Ctrl+X로 잘라 탐색기 창을 닫고, 바탕화면 빈 곳 우클릭 메뉴의 붙여넣기로 붙인다',
      expected: [
        '탐색기 창을 닫아도 잘라낸 React가 바탕화면에 붙는다',
        'Blog 폴더를 다시 열면 React가 없다',
      ],
      docs: ['[[항목 조작:잘라내기와 붙여넣기]]', '[[바탕화면 우클릭 메뉴:빈 곳]]'],
      async run({ page, check }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        const explorer = page.getByRole('region', { name: 'Blog - 파일 탐색기' });
        const content = explorer.getByRole('listbox', { name: '폴더 내용' });
        await content.getByRole('option', { name: 'React', exact: true }).click();
        await page.keyboard.press('Control+X');
        // 잘라낸 항목은 창 밖에 두므로 창을 닫아도 바탕화면에 붙여넣을 수 있다.
        await explorer.getByRole('button', { name: '닫기', exact: true }).click();
        await icons.click({ button: 'right', position: { x: 500, y: 400 } });
        await page.getByRole('menuitem', { name: /^붙여넣기/ }).click();
        await check('탐색기 창을 닫아도 잘라낸 React가 바탕화면에 붙는다', async () => {
          await expect(icons.getByRole('option', { name: 'React', exact: true })).toBeVisible();
        });

        await icons.getByRole('option', { name: 'Blog' }).dblclick();
        await check('Blog 폴더를 다시 열면 React가 없다', async () => {
          await expect(content.getByRole('option', { name: 'Next.js' })).toBeVisible();
          await expect(content.getByRole('option', { name: 'React', exact: true })).toHaveCount(0);
        });
      },
    },
  ],
});
