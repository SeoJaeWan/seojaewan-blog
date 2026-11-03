import { expect } from '@playwright/test';

import { dragMouse } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창이 열린 채 브라우저 화면 크기를 바꾼다',
  area: '창',
  summary: '제목 표시줄이 남게 당겨졌다 돌아감',
  conditions: {
    resize: {
      label: '브라우저 크기 변화',
      values: ['줄었다 다시 커짐', '줄어든 사이 끌어 옮김'],
      base: '줄었다 다시 커짐',
    },
    titleBar: {
      label: '줄어든 화면에서 제목 표시줄',
      values: ['화면 밖으로 나감', '화면 안에 남음'],
      base: '화면 밖으로 나감',
    },
    placement: {
      label: '창 상태',
      values: ['보통', '최대화', '스냅됨'],
      base: '보통',
    },
    screen: {
      label: '화면 크기',
      values: ['PC', '노트북', '모바일'],
      base: 'PC',
    },
  },
  noCase: {
    screen: {
      모바일: {
        reason: '모바일에서는 창이 늘 전체화면이라 자리를 옮길 수 없어 당겨 보일 일이 없다',
        docs: ['[[창 동작:모바일]]'],
      },
    },
  },
  cases: [
    {
      id: 'pull-back-and-return',
      result: '당겨졌다 원래 자리로',
      scenario:
        'PC 크기 화면(1800×1000)에서 파일 탐색기 창을 제목 표시줄로 오른쪽 500px 끌어 옮긴 뒤, 브라우저 폭을 800으로 줄였다가 1800으로 되돌린다',
      expected: [
        '폭이 줄면 제목 표시줄 200px이 남도록 창이 x=600까지 당겨진다',
        '창 크기는 줄지 않는다',
        '폭이 다시 커지면 창이 끌어 둔 원래 자리로 돌아간다',
      ],
      docs: ['[[창 동작:창 조작]]'],
      async run({ page, check }) {
        await page.setViewportSize({ width: 1800, height: 1000 });
        await page.goto('/');
        await page.getByRole('button', { name: '파일 탐색기' }).click();
        const explorer = page.getByRole('region', { name: '바탕 화면 - 파일 탐색기' });
        await expect(explorer).toBeVisible();
        const start = await explorer.boundingBox();
        if (start === null) {
          throw new Error('창 자리를 알 수 없다');
        }

        // 탭과 새 탭 버튼 오른쪽의 빈 제목 표시줄을 잡고 오른쪽으로 500px 옮긴다.
        const grab = { x: start.x + 600, y: start.y + 16 };
        await dragMouse(page, grab, { x: grab.x + 500, y: grab.y });
        await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(start.x + 500);

        // 화면 폭 800에서는 제목 표시줄 200px이 남는 자리(800 - 200)까지 당겨 보이고, 창 크기는 그대로다.
        await page.setViewportSize({ width: 800, height: 1000 });
        await check('폭이 줄면 제목 표시줄 200px이 남도록 창이 x=600까지 당겨진다', async () => {
          await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(600);
        });
        await check('창 크기는 줄지 않는다', async () => {
          await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(start.width);
        });

        await page.setViewportSize({ width: 1800, height: 1000 });
        await check('폭이 다시 커지면 창이 끌어 둔 원래 자리로 돌아간다', async () => {
          await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(start.x + 500);
        });
      },
    },
  ],
});
