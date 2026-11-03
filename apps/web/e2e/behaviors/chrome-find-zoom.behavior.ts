import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '글에서 찾고 배율을 바꾼다',
  area: 'Chrome',
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
      label: '찾기 닫기',
      values: ['Esc', '닫기 버튼', '탭을 바꿈', '다른 페이지로 감'],
      base: 'Esc',
    },
    zoom: {
      label: '배율 바꾸기',
      values: ['⋮ 메뉴 +', '⋮ 메뉴 −', 'Ctrl + +', 'Ctrl + -', 'Ctrl + 0'],
      base: '⋮ 메뉴 +',
    },
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  cases: [
    {
      id: 'ctrl-f-and-zoom-in',
      purpose: '글에서 Ctrl+F로 찾아 개수를 보고 Esc로 닫고, ⋮ 메뉴에서 배율을 키운다',
      docs: ['[[Chrome:페이지에서 찾기]]', '[[Chrome:확대/축소]]'],
      async run({ page }) {
        await page.goto('/posts/react-19-hooks');
        const post = page.getByRole('region', { name: 'React 19 훅 정리 - Chrome' });
        await expect(post.getByRole('heading', { name: 'useActionState' })).toBeVisible();

        await post.getByRole('heading', { level: 1, name: 'React 19 훅 정리' }).click();
        await page.keyboard.press('Control+f');
        const findBar = post.getByRole('search', { name: '페이지에서 찾기' });
        const input = findBar.getByRole('searchbox');
        await expect(input).toBeFocused();
        await input.fill('useActionState');
        await expect(findBar).toContainText(/\b1\/[1-9]\d*/);
        await input.press('Escape');
        await expect(findBar).toBeHidden();

        await post.getByRole('button', { name: '더보기' }).click();
        const zoom = page.getByRole('group', { name: '확대/축소' });
        await zoom.getByRole('menuitem', { name: '확대' }).click();
        await expect(zoom).toContainText('110%');
      },
    },
  ],
});
