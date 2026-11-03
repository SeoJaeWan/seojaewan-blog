import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '바탕화면과 탐색기 사이에서 잘라 붙인다',
  area: '바탕화면',
  conditions: {
    from: {
      label: '잘라낸 곳',
      values: ['바탕화면', '탐색기'],
      base: '바탕화면',
    },
    input: {
      label: '입력',
      values: ['마우스', '키보드', '터치'],
      base: '마우스',
    },
    between: {
      label: '그사이',
      values: ['창을 닫음', '없음', '잘라낸 항목이 휴지통에 들어감'],
      base: '창을 닫음',
    },
    target: {
      label: '붙여넣는 곳',
      values: ['옮길 수 있는 곳', '옮길 수 없는 곳'],
      base: '옮길 수 있는 곳',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'desktop-explorer-round-trip',
      purpose:
        '바탕화면에서 잘라낸 아이콘을 탐색기에 붙여넣고, 탐색기에서 잘라낸 항목을 창을 닫은 뒤 바탕화면에 붙여넣는다',
      docs: ['[[항목 조작:잘라내기와 붙여넣기]]', '[[바탕화면 우클릭 메뉴:아이콘]]'],
      async run({ page }) {
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
        await expect(content.getByRole('option', { name: 'GitHub' })).toBeVisible();
        await expect(github).not.toBeAttached();

        await content.getByRole('option', { name: 'GitHub' }).click();
        await page.keyboard.press('Control+X');
        // 잘라낸 항목은 창 밖에 두므로 창을 닫아도 바탕화면에 붙여넣을 수 있다.
        await explorer.getByRole('button', { name: '닫기', exact: true }).click();
        await icons.click({ button: 'right', position: { x: 500, y: 400 } });
        await page.getByRole('menuitem', { name: /^붙여넣기/ }).click();
        await expect(github).toBeVisible();
      },
    },
    {
      id: 'touch-long-press',
      change: { input: '터치', screen: '모바일', between: '없음' },
      device: 'Pixel 7',
      purpose:
        '모바일에서 아이콘을 길게 누르면 메뉴가 뜨고 따라오는 클릭은 항목을 열지 않으며, 잘라내기 → 탐색기 빈 곳 길게 누르기 → 붙여넣기로 옮긴다',
      docs: [
        '[[반응형:입력 차이]]',
        '[[바탕화면 우클릭 메뉴:모바일]]',
        '[[항목 조작:잘라내기와 붙여넣기]]',
      ],
      async run({ page, context, touch }) {
        await page.goto('/');
        const icons = page.getByRole('listbox', { name: '바탕화면 아이콘' });
        const github = icons.getByRole('option', { name: 'GitHub' });

        await touch.longPress(github);
        const cut = page.getByRole('menuitem', { name: /^잘라내기/ });
        await expect(cut).toBeVisible();
        // 손가락을 뗀 뒤 따라오는 클릭이 외부 링크를 새 탭으로 열지 않았다.
        expect(context.pages()).toHaveLength(1);
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
        await expect(paste).toBeEnabled();
        await touch.tap(paste);
        await expect(content.getByRole('option', { name: 'GitHub' })).toBeVisible();
      },
    },
  ],
});
