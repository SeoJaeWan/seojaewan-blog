import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '홈을 연다',
  area: '공통',
  conditions: {
    screen: {
      label: '화면',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
    clock: {
      label: '시각',
      values: ['기기 현재 시각', '오전', '오후', '분이 바뀜'],
      base: '기기 현재 시각',
    },
  },
  cases: [
    {
      id: 'no-console-error',
      purpose: '홈 화면이 콘솔 오류(수화 불일치 등) 없이 열린다',
      docs: ['[[반응형:기준]]', '[[바탕화면:표시하는 항목]]'],
      async run({ page }) {
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') {
            errors.push(message.text());
          }
        });
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });

        const response = await page.goto('/');

        expect(response?.ok()).toBe(true);
        await expect(page.getByRole('main', { name: '바탕화면' })).toBeVisible();
        await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
        expect(errors).toEqual([]);
      },
    },
    {
      id: 'taskbar-clock',
      change: { clock: '오후' },
      purpose: '바탕화면 아래에 작업 표시줄(시작 버튼, 시계)이 보인다',
      docs: ['[[작업 표시줄:시계]]'],
      async run({ page }) {
        await page.clock.setFixedTime(new Date(2026, 9, 20, 15, 24));
        await page.goto('/');

        await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
        await expect(page.getByText('오후 3:24')).toBeVisible();
        await expect(page.getByText('2026-10-20')).toBeVisible();
      },
    },
  ],
});
