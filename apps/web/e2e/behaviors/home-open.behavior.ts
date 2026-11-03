import { expect } from '@playwright/test';

import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '홈을 연다',
  area: '공통',
  summary: '오류 없이 열림·시계에 오후 시각',
  conditions: {
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
    clock: {
      label: '시계 시각',
      values: ['기기 현재 시각', '오전', '오후', '분이 바뀜'],
      base: '기기 현재 시각',
    },
  },
  cases: [
    {
      id: 'no-console-error',
      result: '오류 없이 바탕화면이 보임',
      scenario: '주소 /로 들어와 홈 화면이 열리는 동안 콘솔 오류를 모은다',
      expected: [
        '홈 주소가 정상으로 응답한다',
        '바탕화면과 시작 버튼이 보인다',
        '콘솔 오류와 페이지 오류가 없다',
      ],
      docs: ['[[반응형:기준]]', '[[바탕화면:표시하는 항목]]'],
      async run({ page, check }) {
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

        await check('홈 주소가 정상으로 응답한다', async () => {
          await expect.poll(() => response?.ok()).toBe(true);
        });
        await check('바탕화면과 시작 버튼이 보인다', async () => {
          await expect(page.getByRole('main', { name: '바탕화면' })).toBeVisible();
          await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
        });
        await check('콘솔 오류와 페이지 오류가 없다', async () => {
          await expect.poll(() => errors).toEqual([]);
        });
      },
    },
    {
      id: 'taskbar-clock',
      result: '오후 3:24와 날짜가 보임',
      change: { clock: '오후' },
      scenario: '기기 시각을 2026-10-20 오후 3:24로 맞추고 주소 /로 들어온다',
      expected: [
        '작업 표시줄에 시작 버튼이 보인다',
        '시계에 오후 3:24가 보인다',
        '시계에 날짜 2026-10-20이 보인다',
      ],
      docs: ['[[작업 표시줄:시계]]'],
      async run({ page, check }) {
        await page.clock.setFixedTime(new Date(2026, 9, 20, 15, 24));
        await page.goto('/');

        await check('작업 표시줄에 시작 버튼이 보인다', async () => {
          await expect(page.getByRole('button', { name: '시작' })).toBeVisible();
        });
        await check('시계에 오후 3:24가 보인다', async () => {
          await expect(page.getByText('오후 3:24')).toBeVisible();
        });
        await check('시계에 날짜 2026-10-20이 보인다', async () => {
          await expect(page.getByText('2026-10-20')).toBeVisible();
        });
      },
    },
  ],
});
