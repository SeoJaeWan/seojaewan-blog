import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '글에서 찾고 배율을 바꾼다',
  area: 'Chrome',
  summary: '찾기 개수가 보이고 배율 110%',
  conditions: {
    findOpen: {
      label: '찾기 여는 법',
      values: ['Ctrl+F', '⋮ 메뉴'],
      base: 'Ctrl+F',
    },
    findMove: {
      label: '찾기 이동',
      values: ['입력만', 'Enter(다음)', 'Shift+Enter(이전)', '↑·↓ 버튼'],
      base: '입력만',
    },
    findClose: {
      label: '찾기 닫는 법',
      values: ['Esc', '닫기 버튼', '탭을 바꿈', '다른 페이지로 감'],
      base: 'Esc',
    },
    zoom: {
      label: '배율 바꾸는 법',
      values: ['⋮ 메뉴 +', '⋮ 메뉴 −', 'Ctrl + +', 'Ctrl + -', 'Ctrl + 0'],
      base: '⋮ 메뉴 +',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'ctrl-f-and-zoom-in',
      result: '찾기 1/N, 배율 110%',
      scenario:
        'React 19 훅 정리 글에서 본문을 눌러 Ctrl+F로 찾기 막대를 열고 "useActionState"를 입력한 뒤 Esc로 닫고, ⋮ 메뉴의 확대(+)를 한 번 누른다',
      expected: [
        '찾기 입력칸에 포커스가 간다',
        '일치하는 개수가 "1/N" 꼴로 보인다',
        'Esc를 누르면 찾기 막대가 닫힌다',
        '⋮ 메뉴에서 확대하면 배율이 110%가 된다',
      ],
      docs: ['[[Chrome:페이지에서 찾기]]', '[[Chrome:확대/축소]]'],
      async run({ page, check }) {
        await page.goto('/posts/react-19-hooks');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();

        await post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }).click();
        await page.keyboard.press('Control+f');
        const findBar = post.getByRole('search', { name: '페이지에서 찾기' });
        const input = findBar.getByRole('searchbox');
        await check('찾기 입력칸에 포커스가 간다', async () => {
          await expect(input).toBeFocused();
        });
        await input.fill('useActionState');
        await check('일치하는 개수가 "1/N" 꼴로 보인다', async () => {
          await expect(findBar).toContainText(/\b1\/[1-9]\d*/);
        });
        await input.press('Escape');
        await check('Esc를 누르면 찾기 막대가 닫힌다', async () => {
          await expect(findBar).toBeHidden();
        });

        await post.getByRole('button', { name: '더보기' }).click();
        const zoom = page.getByRole('group', { name: '확대/축소' });
        await zoom.getByRole('menuitem', { name: '확대' }).click();
        await check('⋮ 메뉴에서 확대하면 배율이 110%가 된다', async () => {
          await expect(zoom).toContainText('110%');
        });
      },
    },
  ],
});
