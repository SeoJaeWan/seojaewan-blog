import { expect } from '@playwright/test';

import { dragMouse } from './app-steps.ts';
import { defineBehavior } from './define-behavior.ts';

export const behavior = defineBehavior({
  name: '창이 열린 채 브라우저 화면 크기를 바꾼다',
  area: '창',
  conditions: {
    resize: {
      label: '화면 변화',
      values: ['줄었다 다시 커짐', '줄어든 사이 끌어 옮김'],
      base: '줄었다 다시 커짐',
    },
    titleBar: {
      label: '제목 표시줄',
      values: ['화면 밖으로 나감', '화면 안에 남음'],
      base: '화면 밖으로 나감',
    },
    placement: {
      label: '창 상태',
      values: ['보통', '최대화', '스냅됨'],
      base: '보통',
    },
  },
  cases: [
    {
      id: 'pull-back-and-return',
      purpose: '브라우저 화면이 줄면 창을 보이는 동안만 당기고, 다시 커지면 원래 자리로 돌아간다',
      docs: ['[[창 동작:창 조작]]'],
      async run({ page }) {
        await page.setViewportSize({ width: 1280, height: 720 });
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
        await page.setViewportSize({ width: 800, height: 720 });
        await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(600);
        await expect.poll(async () => (await explorer.boundingBox())?.width).toBe(start.width);

        await page.setViewportSize({ width: 1280, height: 720 });
        await expect.poll(async () => (await explorer.boundingBox())?.x).toBe(start.x + 500);
      },
    },
  ],
});
